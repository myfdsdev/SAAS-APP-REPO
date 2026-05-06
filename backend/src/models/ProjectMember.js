import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  project_name: { type: String, required: true },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user_email: { type: String, required: true },
  user_name: { type: String, required: true },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    default: 'member',
  },
}, { timestamps: true });

projectMemberSchema.index({ company_id: 1, project_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model('ProjectMember', projectMemberSchema);
