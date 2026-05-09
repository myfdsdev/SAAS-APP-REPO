import crypto from "crypto";
import Company from "../models/Company.js";
import CompanyInvite from "../models/CompanyInvite.js";
import User from "../models/User.js";
import AppSettings from "../models/AppSettings.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { generatePrefix, getNextEmployeeId } from "../utils/employeeIdGenerator.js";
import { sendCompanyInviteEmail } from "../utils/sendEmail.js";
import {
  clearExpiredCompanySuspension,
  getCompanyAccessBlock,
} from "../utils/accessControl.js";

const buildUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  department: user.department,
  employee_id: user.employee_id,
  mobile_number: user.mobile_number,
  profile_photo: user.profile_photo,
  company_id: user.company_id,
  company: user.company_id && typeof user.company_id === "object" ? user.company_id : undefined,
  is_profile_complete: user.is_profile_complete,
  joined_company_at: user.joined_company_at,
});

const requireCompanyAdmin = (req, res) => {
  if (!req.user?.company_id) {
    res.status(403).json({ error: "No company associated with this user" });
    return false;
  }
  // Super admins implicitly count as admin everywhere — they can manage any
  // workspace they're inside without losing their super_admin role.
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
};

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Company.generateInviteCode();
    const existing = await Company.exists({ invite_code: code });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique invite code");
};

const normalizeCompanyPayload = (body) => {
  const name = (body.name || body.company_name || "").trim();
  return {
    name,
    industry: body.industry || "",
    company_size: body.company_size || body.size || "",
    logo: body.logo || "",
    favicon: body.favicon || "",
    primary_color: body.primary_color || "#6366f1",
    html_title: body.html_title || name,
    address: body.address || "",
    phone: body.phone || "",
    website: body.website || "",
  };
};

// @desc    Create a new tenant company and make current user its admin
// @route   POST /api/companies/create
export const createCompany = asyncHandler(async (req, res) => {
  const payload = normalizeCompanyPayload(req.body);

  if (!payload.name) {
    return res.status(400).json({ error: "Company name is required" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const prefix = (req.body.prefix || generatePrefix(payload.name)).toUpperCase().slice(0, 4);
  const inviteCode = await generateUniqueInviteCode();
  const subdomain = await Company.generateSubdomain(payload.name);

  const company = await Company.create({
    ...payload,
    prefix,
    subdomain,
    created_by: user._id,
    owner_id: user._id,
    owner_email: user.email,
    invite_code: inviteCode,
    plan: "free",
    subscription_plan: "free",
    subscription_status: "active",
  });

  const employeeId = await getNextEmployeeId(company._id);
  user.company_id = company._id;
  // Super admins keep their role forever — they act as admin inside the
  // workspace via membership.role, but the user-level role stays super_admin.
  if (user.role !== "super_admin") {
    user.role = "admin";
  }
  user.employee_id = employeeId;
  user.joined_company_at = new Date();

  // Track this workspace in the user's membership history so they can switch
  // back to it later from the chooser page.
  user.workspaces = (user.workspaces || []).filter(
    (w) => String(w.company_id) !== String(company._id),
  );
  user.workspaces.push({
    company_id: company._id,
    employee_id: employeeId,
    role: "admin",
    joined_at: new Date(),
    last_used_at: new Date(),
  });
  await user.save();

  const settings = await AppSettings.getForCompany(company._id);
  settings.app_name = company.name;
  settings.html_title = company.html_title || company.name;
  settings.app_logo = company.logo || "";
  settings.favicon = company.favicon || "";
  settings.primary_color = company.primary_color || settings.primary_color;
  settings.updated_by = user.email;
  await settings.save();

  const populatedUser = await User.findById(user._id)
    .select("-password")
    .populate("company_id");

  res.status(201).json({
    company,
    user: buildUserResponse(populatedUser),
  });
});

// @desc    Join an existing tenant company by invite code
// @route   POST /api/companies/join
export const joinCompany = asyncHandler(async (req, res) => {
  const inviteCode = String(req.body.invite_code || req.body.code || "")
    .trim()
    .toUpperCase();

  if (!inviteCode) {
    return res.status(400).json({ error: "Invite code is required" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const company = await Company.findOne({
    invite_code: inviteCode,
    is_active: true,
    $or: [{ status: "active" }, { status: { $exists: false } }],
  });
  if (!company) return res.status(404).json({ error: "Invalid invite code" });

  // If they've been here before, restore their old employee_id; otherwise mint a new one.
  const existingMembership = (user.workspaces || []).find(
    (w) => String(w.company_id) === String(company._id),
  );
  const employeeId = existingMembership?.employee_id || (await getNextEmployeeId(company._id));

  user.company_id = company._id;
  if (user.role !== "super_admin") {
    user.role = existingMembership?.role || "user";
  }
  user.employee_id = employeeId;
  user.joined_company_at = new Date();

  user.workspaces = (user.workspaces || []).filter(
    (w) => String(w.company_id) !== String(company._id),
  );
  user.workspaces.push({
    company_id: company._id,
    employee_id: employeeId,
    role: user.role,
    joined_at: existingMembership?.joined_at || new Date(),
    last_used_at: new Date(),
  });
  await user.save();

  if (req.body.invite_token) {
    await CompanyInvite.findOneAndUpdate(
      {
        token: req.body.invite_token,
        company_id: company._id,
        email: user.email,
        status: "pending",
      },
      { status: "accepted" },
    );
  }

  const populatedUser = await User.findById(user._id)
    .select("-password")
    .populate("company_id");

  res.json({
    company,
    user: buildUserResponse(populatedUser),
  });
});

// @desc    Exit the active workspace — Slack/Discord-style. The user is NOT
//          removed from the company; their membership stays in workspaces[],
//          they remain visible to admins as an offline team member, and they
//          can switch back any time. Only the *active session* is cleared.
// @route   POST /api/companies/leave
export const leaveCompany = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.company_id) {
    return res.status(400).json({ error: "You're not in a workspace" });
  }

  // Clear active-session fields so they land on the chooser, but DON'T
  // touch their workspaces[] membership — they're still part of the team.
  user.company_id = null;
  user.employee_id = "";
  if (user.role !== "super_admin") {
    user.role = "user";
  }
  user.joined_company_at = null;
  // Mark them offline so admins see "offline" instead of "online" next to
  // their name in the team list.
  user.is_online = false;
  user.last_active = new Date();
  await user.save();

  const populatedUser = await User.findById(user._id).select("-password");
  res.json({ user: buildUserResponse(populatedUser) });
});

// @desc    List every workspace this user has ever joined or created. Drives
//          the "Your workspaces" list on the chooser page. Banned/deleted
//          workspaces are still returned (with `blocked: true` + reason) so
//          the user sees a clear notice instead of having them silently vanish.
// @route   GET /api/companies/workspaces
export const listMyWorkspaces = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "workspaces.company_id",
    select:
      "name logo subdomain prefix status status_reason suspended_until is_active createdAt deleted_at",
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const rows = (user.workspaces || [])
    .filter((w) => w.company_id) // hard-deleted (truly gone) docs are dropped
    .map((w) => {
      const company = w.company_id;
      const status = company.status || "active";
      const blocked = ["deleted", "banned", "blocked", "suspended"].includes(status);
      return {
        id: w._id,
        company,
        role: w.role,
        employee_id: w.employee_id,
        joined_at: w.joined_at,
        last_used_at: w.last_used_at,
        is_active:
          user.company_id && String(user.company_id) === String(company._id),
        // Surfaced to the chooser UI so we can render a "banned" notice card.
        blocked,
        block_reason: blocked
          ? company.status_reason ||
            (status === "deleted"
              ? "This workspace has been deleted by the platform team."
              : status === "banned"
                ? "This workspace has been banned by the platform team."
                : status === "blocked"
                  ? "This workspace has been blocked by the platform team."
                  : "This workspace is temporarily suspended.")
          : null,
        block_status: blocked ? status : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime(),
    );

  res.json(rows);
});

// @desc    Mark a workspace as the user's default. Doesn't switch the active
//          session — just bumps `last_used_at` so it sorts to the top of the
//          chooser list and is auto-loaded next time they hit the chooser.
// @route   POST /api/companies/default/:companyId
export const setDefaultWorkspace = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const targetId = String(req.params.companyId);
  const membership = (user.workspaces || []).find(
    (w) => String(w.company_id) === targetId,
  );
  if (!membership) {
    return res.status(404).json({ error: "Workspace not in your memberships" });
  }

  // Bump last_used_at so it sorts first, but don't change active company_id.
  membership.last_used_at = new Date();
  await user.save();
  res.json({ success: true, workspace_id: targetId });
});

// @desc    Remove a specific workspace from the user's membership list.
//          For an active company, if they're the *only* admin we block —
//          they'd orphan it. For a deleted/banned/blocked/suspended company
//          there's no orphaning concern, so we skip that check and let them
//          dismiss the card from their list.
// @route   POST /api/companies/leave/:companyId
export const leaveSpecificWorkspace = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const targetId = String(req.params.companyId);
  const membership = (user.workspaces || []).find(
    (w) => String(w.company_id) === targetId,
  );
  if (!membership) {
    return res.status(404).json({ error: "You're not in that workspace" });
  }

  // Look up the company so we can skip last-admin check for blocked ones.
  const company = await Company.findById(targetId);
  const blockedStatuses = ["deleted", "banned", "blocked", "suspended"];
  const isCompanyDead = company && blockedStatuses.includes(company.status);

  // Last-admin check — only enforced when the company is still active.
  if (
    membership.role === "admin" &&
    user.role !== "super_admin" &&
    !isCompanyDead
  ) {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      "workspaces.company_id": targetId,
      "workspaces.role": "admin",
    });
    if (otherAdmins === 0) {
      return res.status(400).json({
        error:
          "You're the only admin of this workspace. Promote another admin or delete the workspace before leaving.",
      });
    }
  }

  user.workspaces = (user.workspaces || []).filter(
    (w) => String(w.company_id) !== targetId,
  );

  // If they just left their active workspace, clear active state.
  if (user.company_id && String(user.company_id) === targetId) {
    user.company_id = null;
    if (user.role !== "super_admin") {
      user.role = "user";
    }
    user.employee_id = "";
    user.joined_company_at = null;
  }

  await user.save();
  res.json({ success: true, message: "Left workspace" });
});

// @desc    Switch the active workspace to one in the user's membership history.
// @route   POST /api/companies/switch/:companyId
export const switchWorkspace = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const targetId = String(req.params.companyId);
  const membership = (user.workspaces || []).find(
    (w) => String(w.company_id) === targetId,
  );
  if (!membership) {
    return res.status(403).json({
      error: "You don't have access to that workspace. Use an invite code to join.",
    });
  }

  const company = await Company.findById(targetId);
  if (!company) return res.status(404).json({ error: "Workspace not found" });

  // Block access to deleted/banned/blocked/suspended workspaces with a
  // friendly notice. Super admins bypass — they can still inspect anything.
  const blockedStatuses = ["deleted", "banned", "blocked", "suspended"];
  if (blockedStatuses.includes(company.status) && user.role !== "super_admin") {
    const fallback =
      company.status === "deleted"
        ? "This workspace has been deleted by the platform team."
        : company.status === "banned"
          ? "This workspace has been banned by the platform team."
          : company.status === "blocked"
            ? "This workspace has been blocked by the platform team."
            : "This workspace is temporarily suspended.";
    return res.status(403).json({
      code: company.status,
      error: company.status_reason || fallback,
      status: company.status,
    });
  }

  user.company_id = company._id;
  if (user.role !== "super_admin") {
    user.role = membership.role;
  }
  user.employee_id = membership.employee_id;
  user.joined_company_at = membership.joined_at;
  membership.last_used_at = new Date();
  await user.save();

  const populatedUser = await User.findById(user._id)
    .select("-password")
    .populate("company_id");

  res.json({ company, user: buildUserResponse(populatedUser) });
});

// @desc    Get current user's company
// @route   GET /api/companies/my
export const getMyCompany = asyncHandler(async (req, res) => {
  if (!req.user.company_id) {
    return res.status(404).json({ error: "No company associated with this user" });
  }

  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  await clearExpiredCompanySuspension(company);
  const accessBlock = getCompanyAccessBlock(company);
  if (accessBlock) {
    return res.status(403).json({ error: accessBlock.message, code: accessBlock.code });
  }

  res.json(company);
});

// @desc    Update current company
// @route   PUT /api/companies/my
export const updateMyCompany = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  const allowed = [
    "name",
    "company_name",
    "industry",
    "company_size",
    "logo",
    "favicon",
    "primary_color",
    "html_title",
    "address",
    "phone",
    "website",
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "company_name") company.name = req.body[field];
      else company[field] = req.body[field];
    }
  });

  if (req.body.prefix !== undefined) {
    company.prefix = String(req.body.prefix).trim().toUpperCase().slice(0, 4);
  }

  await company.save();

  const settings = await AppSettings.getForCompany(company._id);
  settings.app_name = company.name;
  settings.html_title = company.html_title || company.name;
  settings.app_logo = company.logo || "";
  settings.favicon = company.favicon || "";
  settings.primary_color = company.primary_color || settings.primary_color;
  settings.updated_by = req.user.email;
  await settings.save();

  res.json(company);
});

// @desc    Regenerate company invite code
// @route   POST /api/companies/regenerate-code
export const regenerateInviteCode = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  company.invite_code = await generateUniqueInviteCode();
  await company.save();

  res.json({ invite_code: company.invite_code, company });
});

// @desc    Send an invite email for this company
// @route   POST /api/companies/invite-email
export const inviteByEmail = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email is required" });

  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await CompanyInvite.create({
    company_id: company._id,
    email,
    invited_by: req.user._id,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")[0]
    .trim();
  const inviteLink = `${frontendUrl}/CompanySetup?code=${encodeURIComponent(
    company.invite_code,
  )}&invite=${encodeURIComponent(token)}`;

  await sendCompanyInviteEmail(
    email,
    req.user.full_name || req.user.email,
    company.name,
    inviteLink,
    company.invite_code,
  );

  res.status(201).json({ invite });
});

// @desc    List pending invites for this company
// @route   GET /api/companies/invites
export const listInvites = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const invites = await CompanyInvite.find({
    company_id: req.user.company_id,
    status: "pending",
    expires_at: { $gt: new Date() },
  }).sort("-createdAt");

  res.json(invites);
});

// @desc    List employees of the current workspace.
//          We query by membership (`workspaces.company_id`) — NOT by active
//          `company_id` — so members who are currently in another workspace
//          or signed out still appear. For each member we override the
//          top-level role/employee_id with the membership-specific values
//          (since top-level fields reflect their *current session*, which
//          may be in a different workspace).
// @route   GET /api/companies/employees
export const listEmployees = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const companyId = req.user.company_id;
  const rows = await User.find({ "workspaces.company_id": companyId })
    .select("-password")
    .lean();

  const employees = rows
    .map((user) => {
      const membership = (user.workspaces || []).find(
        (w) => String(w.company_id) === String(companyId),
      );
      if (!membership) return null;

      const isActiveHere =
        user.company_id && String(user.company_id) === String(companyId);

      return {
        ...user,
        // Override with this workspace's view of the user.
        role: membership.role,
        employee_id: membership.employee_id,
        joined_company_at: membership.joined_at,
        // True if their *active* session is currently this workspace.
        is_active_in_workspace: !!isActiveHere,
        // Effective online indicator: must be online AND in this workspace.
        is_online: !!isActiveHere && !!user.is_online,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Online first, then by employee_id, then by name.
      if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
      if (a.employee_id && b.employee_id)
        return String(a.employee_id).localeCompare(String(b.employee_id));
      return String(a.full_name || "").localeCompare(String(b.full_name || ""));
    });

  res.json(employees);
});

// @desc    Update an employee's ID within current company. Works against the
//          user's membership entry for this workspace, so admins can edit IDs
//          even when the member's active session is elsewhere.
// @route   PUT /api/companies/employee/:userId/employee-id
export const updateEmployeeId = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const employeeId = String(req.body.employee_id || "").trim().toUpperCase();
  if (!employeeId) return res.status(400).json({ error: "Employee ID is required" });
  const companyId = req.user.company_id;

  // Check uniqueness against any other member's membership in this workspace.
  const collision = await User.findOne({
    _id: { $ne: req.params.userId },
    workspaces: {
      $elemMatch: { company_id: companyId, employee_id: employeeId },
    },
  });
  if (collision) {
    return res.status(400).json({ error: "Employee ID already exists in this company" });
  }

  const user = await User.findOne({
    _id: req.params.userId,
    "workspaces.company_id": companyId,
  });
  if (!user) return res.status(404).json({ error: "Employee not found" });

  const membership = user.workspaces.find(
    (w) => String(w.company_id) === String(companyId),
  );
  if (membership) membership.employee_id = employeeId;

  // If they're currently active in this workspace, also keep the top-level
  // `employee_id` in sync so their UI shows the new ID immediately.
  if (user.company_id && String(user.company_id) === String(companyId)) {
    user.employee_id = employeeId;
  }
  await user.save();

  const fresh = await User.findById(user._id).select("-password").lean();
  // Echo the membership-specific employee_id back to the admin UI.
  fresh.employee_id = employeeId;
  res.json(fresh);
});

// Legacy/base44 compatibility: list only companies the current user can see.
export const getCompanies = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" && req.user.company_id
    ? { _id: req.user.company_id }
    : { _id: req.user.company_id };

  const companies = await Company.find(filter)
    .sort(req.query.sort || "-createdAt")
    .limit(parseInt(req.query.limit, 10) || 100);

  res.json(companies);
});

export const filterCompanies = getCompanies;

export const getCompanyById = asyncHandler(async (req, res) => {
  if (String(req.params.id) !== String(req.user.company_id)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ error: "Company not found" });
  res.json(company);
});

export const updateCompany = updateMyCompany;

// Workspace owner / super admin deletes a workspace from the chooser. We
// soft-delete (status: "deleted") so super admin can still see it, then
// detach every member so they fall back to the chooser on next request.
export const deleteCompany = asyncHandler(async (req, res) => {
  const targetId = String(req.params.id);
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const company = await Company.findById(targetId);
  if (!company) return res.status(404).json({ error: "Workspace not found" });
  if (company.status === "deleted") {
    return res.status(400).json({ error: "Workspace already deleted" });
  }

  // Authorization: must be a super admin OR an admin-membership holder of
  // this specific workspace.
  const isSuperAdmin = user.role === "super_admin";
  const adminMembership = (user.workspaces || []).find(
    (w) =>
      String(w.company_id) === targetId && w.role === "admin",
  );
  if (!isSuperAdmin && !adminMembership) {
    return res.status(403).json({
      error: "Only an admin of this workspace can delete it.",
    });
  }

  // Optional confirm-name guard — frontend already enforces this, but the
  // backend rejects mismatched names too so curl/postman can't bypass.
  if (req.body?.confirm_name !== undefined) {
    if (
      String(req.body.confirm_name).trim().toLowerCase() !==
      String(company.name).trim().toLowerCase()
    ) {
      return res.status(400).json({
        error: "Workspace name doesn't match. Type it exactly to confirm.",
      });
    }
  }

  company.status = "deleted";
  company.status_reason = "Deleted by workspace owner";
  company.is_active = false;
  company.deleted_at = new Date();
  company.status_updated_by = user._id;
  company.status_updated_at = new Date();
  await company.save();

  // Detach all current members so they land on the chooser on next request.
  const memberIds = await User.find({ company_id: company._id }).distinct("_id");
  await User.updateMany(
    { company_id: company._id },
    {
      $set: {
        company_id: null,
        employee_id: "",
        joined_company_at: null,
      },
    },
  );
  await User.updateMany(
    { _id: { $in: memberIds }, role: { $ne: "super_admin" } },
    { $set: { role: "user" } },
  );

  // Owner-initiated delete = clean removal. Pull the membership entry from
  // every user's workspaces[] so it disappears from their chooser list.
  // (Super-admin deletion from /SuperAdmin keeps the entry, which is what
  // surfaces the "Deleted by platform team" notice card.)
  await User.updateMany(
    { "workspaces.company_id": company._id },
    { $pull: { workspaces: { company_id: company._id } } },
  );

  res.json({ message: "Workspace deleted", company });
});
