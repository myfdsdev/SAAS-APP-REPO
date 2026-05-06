import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badge_type: {
      type: String,
      required: true,
      trim: true,
    },
    badge_name: {
      type: String,
      required: true,
      trim: true,
    },
    earned_date: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

achievementSchema.index({ company_id: 1, user_id: 1, badge_type: 1 }, { unique: true });

export default mongoose.model("Achievement", achievementSchema);
