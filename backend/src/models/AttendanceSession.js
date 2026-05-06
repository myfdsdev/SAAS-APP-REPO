import mongoose from 'mongoose';

const attendanceSessionSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  attendance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true,
  },
  employee_email: { type: String, required: true },
  date: { type: String, required: true },
  check_in: { type: Date, required: true },
  check_out: { type: Date },
  duration_minutes: { type: Number, default: 0 },
  location: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('AttendanceSession', attendanceSessionSchema);
