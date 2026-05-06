import AppSettings from "../models/AppSettings.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const allowedFields = [
  "app_name",
  "app_logo",
  "html_title",
  "favicon",
  "primary_color",
  "office_start_time",
  "office_end_time",
  "auto_checkout_enabled",
  "auto_checkout_hours",
  "auto_checkout_warning_minutes",
  "currency",
  "currency_symbol",
  "late_penalty",
  "half_day_deduction",
  "overtime_rate_per_hour",
  "overtime_multiplier",
  "working_days_per_month",
  "standard_hours_per_day",
];

// @desc    Get app settings. Authenticated users get company settings; public
//          callers get global/default branding for welcome/login screens.
// @route   GET /api/app-settings
export const getAppSettings = asyncHandler(async (req, res) => {
  const companyId = req.user?.company_id?._id || req.user?.company_id || null;
  const settings = companyId
    ? await AppSettings.getForCompany(companyId)
    : await AppSettings.getSingleton();

  res.json(settings);
});

// @desc    Update company app settings
// @route   PUT /api/app-settings
export const updateAppSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update app settings" });
  }

  if (!req.company_id) {
    return res.status(403).json({ error: "No company associated with this user" });
  }

  const settings = await AppSettings.getForCompany(req.company_id);

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      settings[field] = req.body[field];
    }
  });

  settings.updated_by = req.user.email;
  await settings.save();

  try {
    const { getIO } = await import("../sockets/index.js");
    const io = getIO();
    if (io) {
      io.to(`company_${req.company_id}`).emit("app_settings_updated", settings);
    }
  } catch (err) {
    console.error("Failed to broadcast settings update:", err.message);
  }

  res.json(settings);
});
