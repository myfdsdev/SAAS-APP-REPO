import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema({
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
  },
  group_name: { type: String, required: true },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user_email: { type: String, required: true },
  user_name: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  added_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  added_by_name: { type: String, default: '' },
}, { timestamps: true });

// Prevent same user being added twice
groupMemberSchema.index({ company_id: 1, group_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model('GroupMember', groupMemberSchema);
