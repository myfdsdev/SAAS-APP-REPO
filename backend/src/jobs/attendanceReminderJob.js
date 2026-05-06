import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

export const runAttendanceReminder = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const employees = await User.find({ role: 'user' });
    const todayAttendance = await Attendance.find({ date: today });
    const attendedEmails = todayAttendance.map((a) => a.employee_email);

    const missing = employees.filter((e) => !attendedEmails.includes(e.email));

    if (!missing.length) {
      console.log('[CRON] Attendance reminder: all employees checked in ✅');
      return;
    }

    const notifications = await Notification.insertMany(
      missing.map((emp) => ({
        user_email: emp.email,
        title: 'Attendance Reminder',
        message: "Please mark your attendance for today. It's past 10:30 AM.",
        type: 'attendance_reminder',
      }))
    );

    // Real-time push
    try {
      const io = getIO();
      missing.forEach((emp, i) => {
        io.to(`user_${emp._id}`).emit('new_notification', notifications[i]);
      });
    } catch {}

    console.log(`[CRON] Attendance reminder sent to ${missing.length} employees`);
  } catch (err) {
    console.error('[CRON] Attendance reminder error:', err.message);
  }
};