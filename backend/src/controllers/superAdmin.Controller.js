import Company from "../models/Company.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  ACCESS_STATUSES,
  COMPANY_STATUSES,
  buildSuspendedUntil,
  clearExpiredCompanySuspension,
  clearExpiredUserSuspension,
} from "../utils/accessControl.js";

const publicUserFields = "-password -password_reset_token -password_reset_expires";

const normalizeStatusReason = (reason) => String(reason || "").trim().slice(0, 500);

const disconnectUsers = async (users, reason) => {
  try {
    const { forceDisconnectUser } = await import("../sockets/index.js");
    users.forEach((user) => forceDisconnectUser(user._id, reason));
  } catch (err) {
    console.error("Failed to force-disconnect users:", err.message);
  }
};

export const listCompanies = asyncHandler(async (req, res) => {
  const { status, search = "", sort = "-createdAt", limit = 100, page = 1 } = req.query;
  const filter = {};

  if (status && status !== "all") {
    if (status === "active") {
      filter.$or = [{ status: "active" }, { status: { $exists: false } }];
    } else {
      filter.status = status;
    }
  }
  if (search) {
    const searchFilter = [
      { name: { $regex: search, $options: "i" } },
      { owner_email: { $regex: search, $options: "i" } },
      { invite_code: { $regex: search, $options: "i" } },
    ];
    filter.$and = [...(filter.$and || []), { $or: searchFilter }];
  }

  const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [companies, total, userCounts] = await Promise.all([
    Company.find(filter).sort(sort).skip(skip).limit(parsedLimit).lean(),
    Company.countDocuments(filter),
    User.aggregate([
      { $match: { company_id: { $ne: null } } },
      {
        $group: {
          _id: "$company_id",
          total_users: { $sum: 1 },
          admins: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
          active_users: { $sum: { $cond: [{ $eq: ["$is_active", true] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const countMap = new Map(userCounts.map((row) => [String(row._id), row]));

  res.json({
    companies: companies.map((company) => ({
      ...company,
      id: company._id,
      status: company.status || (company.is_active === false ? "blocked" : "active"),
      total_users: countMap.get(String(company._id))?.total_users || 0,
      admins: countMap.get(String(company._id))?.admins || 0,
      active_users: countMap.get(String(company._id))?.active_users || 0,
    })),
    total,
    page: parsedPage,
    pages: Math.ceil(total / parsedLimit),
  });
});

export const getCompanyDetails = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).lean();
  if (!company) return res.status(404).json({ error: "Company not found" });

  const users = await User.find({ company_id: company._id })
    .select(publicUserFields)
    .sort({ role: 1, full_name: 1 });

  res.json({
    company: {
      ...company,
      id: company._id,
      status: company.status || (company.is_active === false ? "blocked" : "active"),
    },
    users,
  });
});

export const setCompanyStatus = asyncHandler(async (req, res) => {
  const { status, reason, suspended_until, duration_hours } = req.body;

  if (!COMPANY_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid company status" });
  }

  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  await clearExpiredCompanySuspension(company);

  company.status = status;
  company.status_reason = status === "active" ? "" : normalizeStatusReason(reason);
  company.suspended_until = status === "suspended"
    ? buildSuspendedUntil({ suspended_until, duration_hours })
    : null;
  company.is_active = status === "active";
  company.status_updated_by = req.user._id;
  company.status_updated_at = new Date();
  company.deleted_at = status === "deleted" ? new Date() : null;

  if (status === "suspended" && !company.suspended_until) {
    return res.status(400).json({ error: "Suspended companies need a duration or suspended_until date" });
  }

  await company.save();

  if (status !== "active") {
    const companyUsers = await User.find({ company_id: company._id }).select("_id");
    await disconnectUsers(companyUsers, `company_${status}`);
  }

  res.json({ message: `Company ${status}`, company });
});

export const softDeleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  company.status = "deleted";
  company.status_reason = normalizeStatusReason(req.body?.reason || "Deleted by super admin");
  company.suspended_until = null;
  company.is_active = false;
  company.status_updated_by = req.user._id;
  company.status_updated_at = new Date();
  company.deleted_at = new Date();
  await company.save();

  const companyUsers = await User.find({ company_id: company._id }).select("_id");
  await disconnectUsers(companyUsers, "company_deleted");

  // Detach the deleted company from every member so they fall through to the
  // workspace chooser on next login. We DON'T remove the workspace history
  // entry — listMyWorkspaces filters out memberships whose company has been
  // deleted (populate returns null), but we keep the row in case the company
  // is ever restored.
  // Step 1: clear company-specific fields for every member.
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
  // Step 2: reset role to "user" — but only for the users we just detached
  // (matched via _id list) and never for super admins.
  const affectedIds = companyUsers.map((u) => u._id);
  await User.updateMany(
    { _id: { $in: affectedIds }, role: { $ne: "super_admin" } },
    { $set: { role: "user" } },
  );

  res.json({ message: "Company deleted", company });
});

export const listUsers = asyncHandler(async (req, res) => {
  const {
    role,
    access_status,
    company_id,
    search = "",
    sort = "-createdAt",
    limit = 100,
    page = 1,
  } = req.query;

  const filter = {};
  if (role && role !== "all") filter.role = role;
  if (access_status && access_status !== "all") {
    if (access_status === "active") {
      filter.$or = [{ access_status: "active" }, { access_status: { $exists: false } }];
    } else {
      filter.access_status = access_status;
    }
  }
  if (company_id) filter.company_id = company_id;
  if (search) {
    const searchFilter = [
      { full_name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    filter.$and = [...(filter.$and || []), { $or: searchFilter }];
  }

  const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(publicUserFields)
      .populate("company_id", "name status is_active suspended_until")
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit),
    User.countDocuments(filter),
  ]);

  res.json({
    users,
    total,
    page: parsedPage,
    pages: Math.ceil(total / parsedLimit),
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["super_admin", "admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  if (String(targetUser._id) === String(req.user._id) && role !== "super_admin") {
    return res.status(400).json({ error: "You cannot remove your own super admin role" });
  }

  if (role === "super_admin") {
    targetUser.company_id = null;
    targetUser.joined_company_at = null;
  }

  targetUser.role = role;
  await targetUser.save();

  const user = await User.findById(targetUser._id)
    .select(publicUserFields)
    .populate("company_id", "name status is_active suspended_until");

  res.json({ message: "User role updated", user });
});

export const setUserAccess = asyncHandler(async (req, res) => {
  const { status, reason, suspended_until, duration_hours } = req.body;

  if (!ACCESS_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid user access status" });
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  if (String(targetUser._id) === String(req.user._id) && status !== "active") {
    return res.status(400).json({ error: "You cannot restrict your own super admin account" });
  }

  await clearExpiredUserSuspension(targetUser);

  targetUser.access_status = status;
  targetUser.access_reason = status === "active" ? "" : normalizeStatusReason(reason);
  targetUser.suspended_until = status === "suspended"
    ? buildSuspendedUntil({ suspended_until, duration_hours })
    : null;
  targetUser.access_updated_by = req.user._id;
  targetUser.access_updated_at = new Date();

  if (status === "active") {
    targetUser.is_active = true;
  }

  if (status === "suspended" && !targetUser.suspended_until) {
    return res.status(400).json({ error: "Suspended users need a duration or suspended_until date" });
  }

  await targetUser.save();

  if (status !== "active") {
    await disconnectUsers([targetUser], `user_${status}`);
  }

  const user = await User.findById(targetUser._id)
    .select(publicUserFields)
    .populate("company_id", "name status is_active suspended_until");

  res.json({ message: `User ${status}`, user });
});
