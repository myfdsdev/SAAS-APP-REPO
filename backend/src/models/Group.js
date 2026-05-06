import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  group_name: {
    type: String,
    required: true,
    trim: true,
  },
  description: { type: String, default: '' },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_by_name: { type: String, required: true },
  group_type: {
    type: String,
    enum: ['public', 'private', 'department', 'attendance', 'project', 'custom'],
    default: 'public',
  },

  group_photo: { type: String, default: '' },
  is_archived: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Group', groupSchema);
