import Feedback from "../models/Feedback.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { sendFeedbackEmail } from "../utils/sendEmail.js";

const sanitizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const getFeedbackRecipients = async (companyId) => {
  const configured = (process.env.FEEDBACK_EMAIL_TO || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (configured.length) return configured;

  const admins = await User.find({ company_id: companyId, role: "admin", is_active: true }).select("email");
  return admins.map((admin) => admin.email).filter(Boolean);
};

export const createFeedback = asyncHandler(async (req, res) => {
  const user = req.user;
  const subject = sanitizeString(req.body.subject);
  const message = sanitizeString(req.body.message);

  if (!subject || !message) {
    return res.status(400).json({ error: "Subject and message are required" });
  }

  const feedback = await Feedback.create({
    company_id: req.company_id,
    employee_id: user._id,
    employee_email: user.email,
    employee_name: user.full_name,
    category: req.body.category || "experience",
    priority: req.body.priority || "normal",
    rating: Number(req.body.rating) || 5,
    subject,
    message,
    allow_contact: req.body.allow_contact !== false,
  });

  const admins = await User.find({
    company_id: req.company_id,
    role: "admin",
    is_active: true,
  }).select("email");
  if (admins.length) {
    await Notification.insertMany(
      admins.map((admin) => ({
        company_id: req.company_id,
        user_email: admin.email,
        title: "New feedback",
        message: `${user.full_name} submitted ${feedback.category} feedback: ${feedback.subject}`,
        type: "general",
        related_id: feedback._id.toString(),
      })),
    );
  }

  const recipients = await getFeedbackRecipients(req.company_id);
  if (recipients.length) {
    Promise.all(
      recipients.map((to) => sendFeedbackEmail({ to, feedback, user })),
    ).catch((error) => console.error("Feedback email error:", error.message));
  }

  res.status(201).json(feedback);
});

export const getMyFeedback = asyncHandler(async (req, res) => {
  const { sort = "-createdAt", limit = 50 } = req.query;
  const feedback = await Feedback.find({ company_id: req.company_id, employee_email: req.user.email })
    .sort(sort)
    .limit(parseInt(limit, 10));

  res.json(feedback);
});

export const getAllFeedback = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    priority,
    sort = "-createdAt",
    limit = 100,
    page = 1,
  } = req.query;

  const filter = { company_id: req.company_id };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  const pageSize = parseInt(limit, 10);
  const skip = (parseInt(page, 10) - 1) * pageSize;
  const [feedback, total] = await Promise.all([
    Feedback.find(filter).sort(sort).skip(skip).limit(pageSize),
    Feedback.countDocuments(filter),
  ]);

  res.json({
    feedback,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / pageSize),
  });
});

export const updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!feedback) return res.status(404).json({ error: "Feedback not found" });

  const allowedFields = ["status", "admin_note"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) feedback[field] = req.body[field];
  });

  feedback.reviewed_by = req.user.email;
  feedback.reviewed_at = new Date();
  await feedback.save();

  await Notification.create({
    company_id: req.company_id,
    user_email: feedback.employee_email,
    title: "Feedback updated",
    message: `Your feedback "${feedback.subject}" is now ${feedback.status}.`,
    type: "general",
    related_id: feedback._id.toString(),
  });

  res.json(feedback);
});
