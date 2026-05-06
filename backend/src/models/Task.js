import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    task_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "todo",
        "in_progress",
        "review",
        "done",
        "not_started",
        "working_on_it",
        "stuck",
      ],
      default: "not_started",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assigned_to_email: { type: String, default: "" },
    assigned_to_name: { type: String, default: "" },
    due_date: { type: Date },
    completed_at: { type: Date },
    position: { type: Number, default: 0 },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Task", taskSchema);
