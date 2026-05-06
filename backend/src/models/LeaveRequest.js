import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
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
    },
    employee_email: { type: String, required: true },
    employee_name: { type: String, required: true },
    leave_type: {
      type: String,
      enum: ["sick", "casual", "annual", "unpaid", "maternity", "other"],
      required: true,
    },
    start_date: { type: String, required: true }, // YYYY-MM-DD
    end_date: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approved_by: { type: String, default: "" },
    approved_at: { type: Date },
    rejection_reason: { type: String, default: "" },
    total_days: { type: Number, default: 0 },
    reviewed_by: { type: String, default: "" },
    reviewed_at: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model("LeaveRequest", leaveRequestSchema);
