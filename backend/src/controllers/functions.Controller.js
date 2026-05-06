import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import AttendanceSession from '../models/AttendanceSession.js';
import MessageReminder from '../models/MessageReminder.js';
import Notification from '../models/Notification.js';
import Subscription from '../models/Subscription.js';
import Company from '../models/Company.js';
import Message from '../models/Message.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getIO } from '../sockets/index.js';

// ==========================================
// 1. calculateAttendance — compute work hours from sessions
// POST /api/functions/calculate-attendance
// ==========================================
export const calculateAttendance = asyncHandler(async (req, res) => {
  const { employee_id, date } = req.body;

  if (!employee_id || !date) {
    return res.status(400).json({ error: 'employee_id and date required' });
  }

  const sessions = await AttendanceSession.find({ company_id: req.company_id, date });
  const mySessions = sessions.filter(
    (s) => s.attendance_id && s.employee_email
  );

  // Match by attendance record (since we store attendance_id, not employee_id on session)
  const attendance = await Attendance.findOne({
    company_id: req.company_id,
    employee_id,
    date,
  });

  if (!attendance) {
    return res.status(404).json({ error: 'Attendance not found' });
  }

  const attendanceSessions = await AttendanceSession.find({
    company_id: req.company_id,
    attendance_id: attendance._id,
  });

  if (!attendanceSessions.length) {
    return res.json({ message: 'No sessions found' });
  }

  let totalWorkMinutes = 0;
  let firstCheckIn = null;
  let lastCheckOut = null;
  let hasActiveSession = false;

  for (const s of attendanceSessions) {
    if (!s.check_out) hasActiveSession = true;
    if (s.duration_minutes) totalWorkMinutes += s.duration_minutes;

    if (!firstCheckIn || new Date(s.check_in) < new Date(firstCheckIn)) {
      firstCheckIn = s.check_in;
    }
    if (s.check_out && (!lastCheckOut || new Date(s.check_out) > new Date(lastCheckOut))) {
      lastCheckOut = s.check_out;
    }
  }

  const totalWorkHours = parseFloat((totalWorkMinutes / 60).toFixed(2));

  // Status based on hours worked
  let status = 'absent';
  if (totalWorkHours >= 9) status = 'present';
  else if (totalWorkHours >= 4.5) status = 'half_day';

  // Late check: first check-in after 10:15 AM
  if (firstCheckIn) {
    const inTime = new Date(firstCheckIn);
    const totalMin = inTime.getHours() * 60 + inTime.getMinutes();
    if (totalMin > 615 && status === 'present') status = 'late';
  }

  attendance.work_hours = totalWorkHours;
  attendance.first_check_in = firstCheckIn;
  attendance.last_check_out = lastCheckOut;
  attendance.has_active_session = hasActiveSession;
  attendance.status = status;
  await attendance.save();

  res.json({
    success: true,
    attendance_id: attendance._id,
    total_work_hours: totalWorkHours,
    status,
    sessions_count: attendanceSessions.length,
  });
});

// ==========================================
// 2. checkMessageReminders — trigger due reminders
// POST /api/functions/check-message-reminders
// Admin or cron
// ==========================================
export const checkMessageReminders = asyncHandler(async (req, res) => {
  const now = new Date();

  const dueReminders = await MessageReminder.find({
    company_id: req.company_id,
    is_triggered: false,
    reminder_time: { $lte: now },
  });

  let triggered = 0;
  for (const reminder of dueReminders) {
    const user = await User.findOne({ _id: reminder.user_id, company_id: req.company_id });
    if (!user) continue;

    await Notification.create({
      company_id: req.company_id,
      user_email: user.email,
      title: 'Message Reminder',
      message: `Reminder: ${reminder.message_text.substring(0, 100)}`,
      type: 'general',
      related_id: reminder.message_id.toString(),
    });

    reminder.is_triggered = true;
    reminder.triggered_at = new Date();
    await reminder.save();
    triggered++;

    // Real-time push
    try {
      getIO().to(`user_${user._id}`).emit('reminder_triggered', reminder);
    } catch {}
  }

  res.json({
    success: true,
    triggered,
    message: `Triggered ${triggered} reminders`,
  });
});

// ==========================================
// 3. exportAttendanceReport — PDF or Excel
// POST /api/functions/export-attendance-report
// Admin only
// Body: { month: "2025-04", format: "pdf" | "excel" }
// ==========================================
export const exportAttendanceReport = asyncHandler(async (req, res) => {
  const { month, format = 'pdf' } = req.body;

  if (!month) {
    return res.status(400).json({ error: 'month (YYYY-MM) required' });
  }

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  // Get employees
  const employees = await User.find({ company_id: req.company_id, role: 'user' }).sort('full_name');

  // Get attendance in date range
  const attendance = await Attendance.find({
    company_id: req.company_id,
    date: { $gte: monthStart, $lte: monthEnd },
  }).sort('date employee_name');

  // Build rows
  const rows = employees.map((emp) => {
    const records = attendance.filter((a) => a.employee_email === emp.email);
    return {
      name: emp.full_name,
      email: emp.email,
      department: emp.department || '-',
      present: records.filter((a) => a.status === 'present').length,
      late: records.filter((a) => a.status === 'late').length,
      half_day: records.filter((a) => a.status === 'half_day').length,
      on_leave: records.filter((a) => a.status === 'on_leave').length,
      absent: records.filter((a) => a.status === 'absent').length,
      total: records.length,
      total_hours: Number(records.reduce((sum, a) => sum + (a.work_hours || 0), 0).toFixed(2)),
      avg_hours: records.length
        ? Number((records.reduce((sum, a) => sum + (a.work_hours || 0), 0) / records.length).toFixed(2))
        : 0,
    };
  });

  const summary = rows.reduce(
    (sum, row) => ({
      present: sum.present + row.present,
      late: sum.late + row.late,
      half_day: sum.half_day + row.half_day,
      on_leave: sum.on_leave + row.on_leave,
      absent: sum.absent + row.absent,
      total: sum.total + row.total,
      total_hours: Number((sum.total_hours + row.total_hours).toFixed(2)),
    }),
    { present: 0, late: 0, half_day: 0, on_leave: 0, absent: 0, total: 0, total_hours: 0 },
  );

  const detailRows = attendance.map((record) => ({
    employee: record.employee_name,
    email: record.employee_email,
    date: record.date,
    status: record.status,
    check_in: record.first_check_in
      ? new Date(record.first_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '-',
    check_out: record.last_check_out
      ? new Date(record.last_check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '-',
    hours: Number(record.work_hours || 0),
  }));

  // ========== PDF ==========
  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text(`Attendance Report - ${month}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Employee', 'Email', 'Dept', 'Present', 'Late', 'Half', 'Leave', 'Absent', 'Total', 'Hours', 'Avg']],
      body: rows.map((r) => [
        r.name,
        r.email,
        r.department,
        r.present,
        r.late,
        r.half_day,
        r.on_leave,
        r.absent,
        r.total,
        r.total_hours,
        r.avg_hours,
      ]),
      foot: [[
        'Total',
        '',
        '',
        summary.present,
        summary.late,
        summary.half_day,
        summary.on_leave,
        summary.absent,
        summary.total,
        summary.total_hours,
        '',
      ]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255 },
      footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance-${month}.pdf`
    );
    return res.send(pdfBuffer);
  }

  // ========== EXCEL ==========
  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OfficeFlow';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Summary');

    sheet.columns = [
      { header: 'Employee', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Late', key: 'late', width: 10 },
      { header: 'Half Day', key: 'half_day', width: 10 },
      { header: 'On Leave', key: 'on_leave', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Total Days', key: 'total', width: 12 },
      { header: 'Total Hours', key: 'total_hours', width: 12 },
      { header: 'Avg Hours', key: 'avg_hours', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    rows.forEach((row) => sheet.addRow(row));
    sheet.addRow({});
    sheet.addRow({
      name: 'TOTAL',
      present: summary.present,
      late: summary.late,
      half_day: summary.half_day,
      on_leave: summary.on_leave,
      absent: summary.absent,
      total: summary.total,
      total_hours: summary.total_hours,
    }).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    const details = workbook.addWorksheet('Daily Details');
    details.columns = [
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Check In', key: 'check_in', width: 12 },
      { header: 'Check Out', key: 'check_out', width: 12 },
      { header: 'Hours', key: 'hours', width: 10 },
    ];
    details.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    details.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' },
    };
    detailRows.forEach((row) => details.addRow(row));
    details.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance-${month}.xlsx`
    );
    return res.send(Buffer.from(buffer));
  }

  // ========== JSON (default) ==========
  res.json({ month, rows, generated_at: new Date() });
});

// ==========================================
// 4. notifyNewMessage — trigger notification for new message
// (Usually auto-handled in messageController.sendMessage now,
// but keeping as a webhook-style endpoint for consistency)
// POST /api/functions/notify-new-message
// ==========================================
export const notifyNewMessage = asyncHandler(async (req, res) => {
  const { message_id } = req.body;

  if (!message_id) {
    return res.status(400).json({ error: 'message_id required' });
  }

  const message = await Message.findOne({ _id: message_id, company_id: req.company_id });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  const notification = await Notification.create({
    company_id: req.company_id,
    user_email: message.receiver_email,
    title: 'New Message',
    message: `${message.sender_name}: ${message.message_text.substring(0, 50)}${
      message.message_text.length > 50 ? '...' : ''
    }`,
    type: 'new_message',
    related_id: message.sender_id.toString(),
  });

  // Real-time push
  try {
    getIO().to(`user_${message.receiver_id}`).emit('new_notification', notification);
  } catch {}

  res.json({ success: true, notified: message.receiver_email });
});

// ==========================================
// 5. processPayment — handle PayPal/Razorpay-style payment
// POST /api/functions/process-payment
// Body: { subscription_id, payment_method, amount, transaction_id? }
// ==========================================
export const processPayment = asyncHandler(async (req, res) => {
  const { subscription_id, payment_method, amount, transaction_id } = req.body;

  if (!subscription_id || !payment_method) {
    return res.status(400).json({ error: 'subscription_id and payment_method required' });
  }

  const sub = await Subscription.findOne({
    _id: subscription_id,
    company_id: req.company_id,
  });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const company = await Company.findById(req.company_id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  // Permission check
  if (company.owner_email !== req.user.email && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Generate transaction ID if not provided
  let finalTxnId = transaction_id;
  if (!finalTxnId) {
    const prefix = payment_method === 'PayPal' ? 'PP' : payment_method === 'Razorpay' ? 'RZP' : 'TXN';
    finalTxnId = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Update subscription
  sub.status = 'active';
  sub.payment_method = payment_method;
  if (amount) sub.price = amount;
  await sub.save();

  // Update company
  company.subscription_status = 'active';
  company.subscription_plan = sub.plan;
  company.payment_method = payment_method;
  await company.save();

  res.json({
    success: true,
    transaction_id: finalTxnId,
    subscription: sub,
    company: { id: company._id, status: company.subscription_status },
  });
});

// ==========================================
// 6. sendAttendanceReminder — notify non-checked-in employees
// POST /api/functions/send-attendance-reminder
// Admin or cron
// ==========================================
export const sendAttendanceReminder = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // All employees (non-admin)
  const employees = await User.find({ company_id: req.company_id, role: 'user' });

  // Today's attendance
  const todayAttendance = await Attendance.find({ company_id: req.company_id, date: today });
  const attendedEmails = todayAttendance.map((a) => a.employee_email);

  // Employees without attendance
  const missing = employees.filter((e) => !attendedEmails.includes(e.email));

  const notifications = await Notification.insertMany(
    missing.map((emp) => ({
      company_id: req.company_id,
      user_email: emp.email,
      title: 'Attendance Reminder',
      message: "Please mark your attendance for today. It's already past 10:30 AM.",
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

  res.json({
    success: true,
    reminders_sent: notifications.length,
    employees_reminded: missing.map((e) => e.email),
  });
});

// ==========================================
// 7. getUsersForMessaging — already in userController
// But adding here as a function alias for consistency with base44 naming
// POST /api/functions/get-users-for-messaging
// ==========================================
export const getUsersForMessaging = asyncHandler(async (req, res) => {
  const users = await User.find({ company_id: req.company_id, _id: { $ne: req.user._id } })
    .select('_id email full_name profile_photo department role is_online last_active')
    .sort('full_name');

  const normalizedUsers = users.map((u) => ({
    id: u._id,
    _id: u._id,
    email: u.email,
    full_name: u.full_name,
    profile_photo: u.profile_photo,
    department: u.department,
    role: u.role,
    is_online: u.is_online,
    last_active: u.last_active,
  }));

  res.json({
    data: { users: normalizedUsers },
  });
});
