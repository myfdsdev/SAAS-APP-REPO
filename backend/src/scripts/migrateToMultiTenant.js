import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import AppSettings from "../models/AppSettings.js";
import Attendance from "../models/Attendance.js";
import AttendanceSession from "../models/AttendanceSession.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Notification from "../models/Notification.js";
import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import Task from "../models/Task.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import GroupMessage from "../models/GroupMessage.js";
import Message from "../models/Message.js";
import MessageReminder from "../models/MessageReminder.js";
import SalaryConfig from "../models/SalaryConfig.js";
import Payslip from "../models/Payslip.js";
import Achievement from "../models/Achievement.js";
import Shift from "../models/Shift.js";
import Feedback from "../models/Feedback.js";
import Subscription from "../models/Subscription.js";
import { generateEmployeeId, generatePrefix } from "../utils/employeeIdGenerator.js";

const tenantModels = [
  Attendance,
  AttendanceSession,
  LeaveRequest,
  Notification,
  Project,
  ProjectMember,
  Task,
  Group,
  GroupMember,
  GroupMessage,
  Message,
  MessageReminder,
  SalaryConfig,
  Payslip,
  Achievement,
  Shift,
  Feedback,
  Subscription,
];

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = Company.generateInviteCode();
    const existing = await Company.exists({ invite_code: code });
    if (!existing) return code;
  }
  throw new Error("Unable to generate unique invite code");
};

const pickAdmin = async () => {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length) {
    const configuredAdmin = await User.findOne({ email: { $in: adminEmails } }).sort("createdAt");
    if (configuredAdmin) return configuredAdmin;
  }

  const firstAdmin = await User.findOne({ role: "admin" }).sort("createdAt");
  if (firstAdmin) return firstAdmin;
  return User.findOne().sort("createdAt");
};

const run = async () => {
  await connectDB();

  const admin = await pickAdmin();
  if (!admin) {
    console.log("No users found. Nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const existingCompany = admin.company_id
    ? await Company.findById(admin.company_id)
    : null;

  const fallbackName = process.env.DEFAULT_COMPANY_NAME || "Default Company";
  const prefix = generatePrefix(fallbackName);

  const company =
    existingCompany ||
    (await Company.create({
      name: fallbackName,
      prefix,
      industry: "General",
      company_size: "",
      created_by: admin._id,
      owner_id: admin._id,
      owner_email: admin.email,
      invite_code: await generateUniqueInviteCode(),
      employee_counter: 0,
      plan: "free",
      subscription_plan: "free",
      subscription_status: "active",
    }));

  company.name = company.name || company.company_name || fallbackName;
  company.prefix = company.prefix || generatePrefix(company.name);
  company.created_by = company.created_by || admin._id;
  company.owner_id = company.owner_id || admin._id;
  company.owner_email = company.owner_email || admin.email;
  company.invite_code = company.invite_code || await generateUniqueInviteCode();

  const users = await User.find({}).sort("createdAt");
  let counter = 0;
  for (const user of users) {
    counter += 1;
    user.company_id = company._id;
    user.joined_company_at = user.joined_company_at || user.createdAt || new Date();
    user.employee_id = generateEmployeeId(company.prefix, counter);
    if (String(user._id) === String(admin._id)) user.role = "admin";
    await user.save();
  }

  company.employee_counter = Math.max(company.employee_counter || 0, users.length);
  await company.save();

  const updates = {};
  for (const Model of tenantModels) {
    const result = await Model.updateMany(
      { $or: [{ company_id: { $exists: false } }, { company_id: null }] },
      { $set: { company_id: company._id } },
    );
    updates[Model.modelName] = result.modifiedCount || 0;
  }

  const singletonSettings = await AppSettings.findOne({
    $or: [{ company_id: { $exists: false } }, { company_id: null }],
  }).sort("createdAt");
  const companySettings = await AppSettings.getForCompany(company._id);
  if (singletonSettings && String(singletonSettings._id) !== String(companySettings._id)) {
    const source = singletonSettings.toObject();
    delete source._id;
    delete source.createdAt;
    delete source.updatedAt;
    delete source.__v;
    Object.assign(companySettings, source, { company_id: company._id });
    await companySettings.save();
  }

  console.log("Multi-tenant migration complete");
  console.table({
    company: `${company.name} (${company._id})`,
    invite_code: company.invite_code,
    users: users.length,
    ...updates,
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
