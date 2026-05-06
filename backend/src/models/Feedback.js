import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employee_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    employee_name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["bug", "feature", "experience", "payroll", "attendance", "other"],
      default: "experience",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    allow_contact: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["new", "reviewing", "resolved", "closed"],
      default: "new",
      index: true,
    },
    admin_note: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    reviewed_by: {
      type: String,
      default: "",
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Feedback", feedbackSchema);
