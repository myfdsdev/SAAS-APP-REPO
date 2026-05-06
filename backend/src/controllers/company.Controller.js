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
  if (req.user.role !== "admin") {
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
  if (user.company_id) {
    return res.status(400).json({ error: "User already belongs to a company" });
  }

  const prefix = (req.body.prefix || generatePrefix(payload.name)).toUpperCase().slice(0, 4);
  const inviteCode = await generateUniqueInviteCode();

  const company = await Company.create({
    ...payload,
    prefix,
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
  user.role = "admin";
  user.employee_id = employeeId;
  user.joined_company_at = new Date();
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
  if (user.company_id) {
    return res.status(400).json({ error: "User already belongs to a company" });
  }

  const company = await Company.findOne({
    invite_code: inviteCode,
    is_active: true,
    $or: [{ status: "active" }, { status: { $exists: false } }],
  });
  if (!company) return res.status(404).json({ error: "Invalid invite code" });

  const employeeId = await getNextEmployeeId(company._id);
  user.company_id = company._id;
  user.role = "user";
  user.employee_id = employeeId;
  user.joined_company_at = new Date();
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

// @desc    List employees in current company
// @route   GET /api/companies/employees
export const listEmployees = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const employees = await User.find({ company_id: req.user.company_id })
    .select("-password")
    .sort({ employee_id: 1, full_name: 1 });

  res.json(employees);
});

// @desc    Update an employee ID within current company
// @route   PUT /api/companies/employee/:userId/employee-id
export const updateEmployeeId = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;

  const employeeId = String(req.body.employee_id || "").trim().toUpperCase();
  if (!employeeId) return res.status(400).json({ error: "Employee ID is required" });

  const existing = await User.findOne({
    _id: { $ne: req.params.userId },
    company_id: req.user.company_id,
    employee_id: employeeId,
  });
  if (existing) {
    return res.status(400).json({ error: "Employee ID already exists in this company" });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.userId, company_id: req.user.company_id },
    { employee_id: employeeId },
    { new: true },
  ).select("-password");

  if (!user) return res.status(404).json({ error: "Employee not found" });
  res.json(user);
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

export const deleteCompany = asyncHandler(async (req, res) => {
  if (!requireCompanyAdmin(req, res)) return;
  return res.status(400).json({
    error: "Company deletion is disabled. Deactivate the company from the billing panel instead.",
  });
});
