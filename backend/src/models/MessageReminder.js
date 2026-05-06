import mongoose from 'mongoose';

const messageReminderSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  message_text: { type: String, required: true },
  reminder_time: { type: Date, required: true },
  is_triggered: { type: Boolean, default: false },
  triggered_at: { type: Date },
}, { timestamps: true });

export default mongoose.model('MessageReminder', messageReminderSchema);
