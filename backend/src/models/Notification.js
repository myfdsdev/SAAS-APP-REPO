import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  user_email: {
    type: String,
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'check_in', 'check_out', 'leave_submitted', 'leave_approved',
      'leave_rejected', 'new_message', 'group_message', 'added_to_group',
      'removed_from_group', 'project_assigned', 'task_assigned',
      'attendance_reminder', 'achievement', 'broadcast', 'salary', 'general',
    ],
    default: 'general',
  },
  related_id: { type: String, default: '' }, // ID of the related entity
  is_read: { type: Boolean, default: false },
  read_at: { type: Date },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
