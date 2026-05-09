import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      // Index defined explicitly below (unique + partial filter) — don't add
      // `index: true` here, it would create a duplicate.
    },
    app_name: {
      type: String,
      default: "AttendEase",
      trim: true,
    },
    app_logo: {
      type: String,
      default: "",
    },
    html_title: {
      type: String,
      default: "AttendEase",
      trim: true,
    },
    favicon: {
      type: String,
      default: "",
    },
    primary_color: {
      type: String,
      default: "#6366f1",
    },
    office_start_time: {
      type: String,
      default: "09:00",
    },
    office_end_time: {
      type: String,
      default: "18:00",
    },
    auto_checkout_enabled: {
      type: Boolean,
      default: true,
    },
    auto_checkout_hours: {
      type: Number,
      default: 2,
      min: 0.25,
      max: 24,
    },
    auto_checkout_warning_minutes: {
      type: Number,
      default: 20,
      min: 1,
      max: 120,
    },
    currency: {
      type: String,
      default: "INR",
    },
    currency_symbol: {
      type: String,
      default: "₹",
    },
    late_penalty: {
      type: Number,
      default: 100,
    },
    half_day_deduction: {
      type: Number,
      default: 500,
    },
    overtime_rate_per_hour: {
      type: Number,
      default: 250,
    },
    overtime_multiplier: {
      type: Number,
      default: 1.5,
    },
    working_days_per_month: {
      type: Number,
      default: 22,
    },
    standard_hours_per_day: {
      type: Number,
      default: 8,
    },
    updated_by: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

appSettingsSchema.index(
  { company_id: 1 },
  {
    unique: true,
    partialFilterExpression: { company_id: { $type: "objectId" } },
  },
);

appSettingsSchema.statics.getForCompany = async function (companyId) {
  if (!companyId) {
    return this.getSingleton();
  }

  let settings = await this.findOne({ company_id: companyId });
  if (!settings) {
    settings = await this.create({ company_id: companyId });
  }
  return settings;
};

// Public branding fallback for unauthenticated pages.
appSettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne({ company_id: null });
  if (!settings) {
    settings = await this.create({ company_id: null });
  }
  return settings;
};

export default mongoose.model("AppSettings", appSettingsSchema);
