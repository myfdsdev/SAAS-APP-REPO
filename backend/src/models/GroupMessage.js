import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, default: '' },
  type: { type: String, default: '' },
  size: { type: Number, default: 0 },
  public_id: { type: String, default: '' },
}, { _id: false });

const groupMessageSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  },
  group_name: { type: String, required: true },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender_email: { type: String, required: true },
  sender_name: { type: String, required: true },
  message_text: { type: String, default: '' },
  attachments: [attachmentSchema],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  is_edited: { type: Boolean, default: false },
  edited_at: { type: Date },
  is_deleted: { type: Boolean, default: false },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachment_url: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('GroupMessage', groupMessageSchema);
