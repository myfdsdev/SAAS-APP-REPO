import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  project_name: {
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
  status: {
    type: String,
    enum: ['active', 'on_hold', 'completed', 'archived'],
    default: 'active',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  start_date: { type: Date },
  end_date: { type: Date },
  is_archived: { type: Boolean, default: false },
  color: { type: String, default: '#3B82F6' },
  notes: { type: String, default: '' },
  // Which table columns to show on the Kanban/board view
  enabled_columns: {
    type: [String],
    default: ['owner', 'status', 'due_date', 'priority', 'notes'],
  },
  files: [{
    file_name: String,
    file_url: String,
    uploaded_by: String,
    uploaded_at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
