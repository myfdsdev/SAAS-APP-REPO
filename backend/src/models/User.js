import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: function () {
        return this.auth_provider !== "google";
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    auth_provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    google_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    full_name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    department: {
      type: String,
      default: "",
    },
    employee_id: {
      type: String,
      default: "",
    },
    mobile_number: {
      type: String,
      default: "",
    },
    profile_photo: {
      type: String,
      default: "",
    },
    is_online: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    access_status: {
      type: String,
      enum: ["active", "blocked", "banned", "suspended"],
      default: "active",
      index: true,
    },
    access_reason: {
      type: String,
      default: "",
    },
    suspended_until: {
      type: Date,
      default: null,
    },
    access_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    access_updated_at: {
      type: Date,
      default: null,
    },
    password_reset_token: {
      type: String,
      default: null,
      select: false,
    },
    password_reset_expires: {
      type: Date,
      default: null,
      select: false,
    },
    last_active: {
      type: Date,
      default: Date.now,
    },
    // Auto-checkout tracking
    last_activity: {
      type: Date,
      default: null,
    },
    auto_checkout_warning_sent: {
      type: Boolean,
      default: false,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    joined_company_at: {
      type: Date,
      default: null,
    },
    // History of every workspace this user has been part of.
    // The currently-active one mirrors `company_id`; the others are dormant
    // memberships the user can switch back to via /api/companies/switch/:id.
    // We retain employee_id + role per-membership so switching restores them.
    workspaces: [
      {
        company_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
          required: true,
        },
        employee_id: { type: String, default: "" },
        role: {
          type: String,
          enum: ["admin", "user"],
          default: "user",
        },
        joined_at: { type: Date, default: Date.now },
        last_used_at: { type: Date, default: Date.now },
      },
    ],
    is_profile_complete: {
      type: Boolean,
      default: false,
    },
    // Per-employee shift assignment (overrides global office hours when set)
    shift_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    // Settings fields (company-wide, editable by admin)
    office_start_time: { type: String, default: "09:00" },
    office_end_time: { type: String, default: "18:00" },
    late_threshold_minutes: { type: Number, default: 15 },
    half_day_hours: { type: Number, default: 4 },
    working_days: {
      type: [String],
      default: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    total_points: { type: Number, default: 0 },
    current_rank: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    last_rank_calc: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index(
  { company_id: 1, employee_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      company_id: { $type: "objectId" },
      employee_id: { $type: "string", $gt: "" },
    },
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
