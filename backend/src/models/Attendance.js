import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employee_email: { type: String, required: true },
  employee_name: { type: String, required: true },
  date: {
    type: String, // format: YYYY-MM-DD
    required: true,
    index: true,
  },
  first_check_in: { type: Date },
  last_check_out: { type: Date },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'on_leave', 'half_day'],
    default: 'present',
  },
  has_active_session: { type: Boolean, default: false },
  work_hours: { type: Number, default: 0 },
  checkout_type: {
    type: String,
    enum: ['manual', 'auto', 'admin'],
    default: 'manual',
  },
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Prevent duplicate attendance on same day for same employee within a company.
attendanceSchema.index({ company_id: 1, employee_email: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
