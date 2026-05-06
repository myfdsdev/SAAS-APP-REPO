import mongoose from "mongoose";

const companyInviteSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
      index: true,
    },
    token: {
      type: String,
      unique: true,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

companyInviteSchema.index({ company_id: 1, email: 1, status: 1 });

export default mongoose.model("CompanyInvite", companyInviteSchema);
