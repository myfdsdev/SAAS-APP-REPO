import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    prefix: {
      type: String,
      required: [true, "Company prefix is required"],
      uppercase: true,
      trim: true,
      maxlength: 4,
    },
    industry: { type: String, default: "" },
    company_size: {
      type: String,
      enum: ["", "1-10", "11-50", "51-200", "200+"],
      default: "",
    },
    logo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    primary_color: { type: String, default: "#6366f1" },
    html_title: { type: String, default: "" },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invite_code: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    employee_counter: { type: Number, default: 0 },
    plan: { type: String, default: "free" },
    max_employees: { type: Number, default: 100 },
    is_active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "blocked", "banned", "suspended", "deleted"],
      default: "active",
      index: true,
    },
    status_reason: { type: String, default: "" },
    suspended_until: { type: Date, default: null },
    status_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status_updated_at: { type: Date, default: null },
    deleted_at: { type: Date, default: null },

    // Legacy billing/profile fields kept so existing subscription code and old
    // company documents continue to hydrate cleanly during migration.
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    owner_email: { type: String, default: "" },
    subscription_plan: {
      type: String,
      enum: ["free", "basic", "pro", "enterprise"],
      default: "free",
    },
    subscription_status: {
      type: String,
      enum: ["active", "inactive", "cancelled", "expired"],
      default: "active",
    },
    payment_method: { type: String, default: "" },
    stripe_customer_id: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    max_users: { type: Number, default: 5 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

companySchema.virtual("company_name")
  .get(function () {
    return this.name;
  })
  .set(function (value) {
    this.name = value;
  });

companySchema.statics.generateInviteCode = function () {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

companySchema.statics.generatePrefix = function (name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "COM";
  if (words.length >= 2) {
    return words.map((word) => word[0]).join("").toUpperCase().slice(0, 4);
  }
  return words[0].slice(0, 3).toUpperCase();
};

export default mongoose.model("Company", companySchema);
