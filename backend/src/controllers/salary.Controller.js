import Payslip from '../models/Payslip.js';
import User from '../models/User.js';
import AppSettings from '../models/AppSettings.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generatePayslipPDF } from '../utils/payslipGenerator.js';
import { sendPayslipEmail } from '../utils/sendEmail.js';
import { emitNotification } from '../sockets/index.js';

const requireAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can perform this action' });
    return false;
  }
  return true;
};

// GET /api/salary/employees?month=YYYY-MM
// List all employees with their payslip status for the given month.
export const getEmployeesWithSalaryStatus = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { month = new Date().toISOString().slice(0, 7) } = req.query;

  const users = await User.find({
    company_id: req.company_id,
    is_active: { $ne: false },
    role: { $ne: 'admin' },
  })
    .select('full_name email employee_id department profile_photo')
    .lean();

  const payslips = await Payslip.find({ company_id: req.company_id, month }).lean();
  const byUser = new Map(payslips.map((p) => [String(p.user_id), p]));

  const rows = users.map((u) => {
    const payslip = byUser.get(String(u._id)) || null;
    return {
      user: u,
      payslip,
      status: payslip?.status || 'none',
      net_salary: payslip?.net_salary || 0,
    };
  });

  res.json({ month, employees: rows });
});

// POST /api/salary/payslip
// Body: { user_id, month, base_salary, bonus, deductions, notes }
// Creates or updates a payslip in 'draft' state.
export const upsertPayslip = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const {
    user_id,
    month,
    base_salary = 0,
    bonus = 0,
    deductions = 0,
    notes = '',
  } = req.body;

  if (!user_id || !month) {
    return res.status(400).json({ error: 'user_id and month are required' });
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' });
  }

  const user = await User.findOne({ _id: user_id, company_id: req.company_id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const settings = await AppSettings.getForCompany(req.company_id);

  let payslip = await Payslip.findOne({ company_id: req.company_id, user_id, month });

  if (!payslip) {
    payslip = new Payslip({
      company_id: req.company_id,
      user_id,
      employee_email: user.email,
      employee_name: user.full_name,
      month,
    });
  }

  if (payslip.status === 'paid') {
    return res
      .status(400)
      .json({ error: 'Cannot modify a payslip that has been marked paid' });
  }

  payslip.base_salary = Number(base_salary) || 0;
  payslip.bonus = Number(bonus) || 0;
  payslip.deductions = Number(deductions) || 0;
  payslip.notes = notes || '';
  payslip.currency = settings.currency || 'INR';
  payslip.currency_symbol = settings.currency_symbol || '₹';
  payslip.generated_by = req.user.email;
  payslip.generated_at = new Date();
  if (payslip.status !== 'sent') payslip.status = 'draft';

  await payslip.save();
  res.json(payslip);
});

// PUT /api/salary/payslip/:id/send
// Generates the PDF, emails it, marks payslip as 'sent'.
export const sendPayslip = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const payslip = await Payslip.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

  const user = await User.findOne({ _id: payslip.user_id, company_id: req.company_id });
  if (!user) return res.status(404).json({ error: 'Employee not found' });

  const settings = await AppSettings.getForCompany(req.company_id);

  let pdfUrl = payslip.payslip_pdf_url;
  try {
    pdfUrl = await generatePayslipPDF(payslip, user, settings);
    payslip.payslip_pdf_url = pdfUrl;
  } catch (err) {
    console.error('[sendPayslip] PDF generation failed:', err.message);
    return res.status(500).json({ error: 'Failed to generate payslip PDF' });
  }

  payslip.status = 'sent';
  payslip.sent_date = new Date();
  await payslip.save();

  try {
    await sendPayslipEmail(user, payslip, pdfUrl);
  } catch (err) {
    console.error('[sendPayslip] email failed:', err.message);
  }

  try {
    const monthName = new Date(`${payslip.month}-01`).toLocaleDateString(
      'en-US',
      { month: 'long', year: 'numeric' },
    );
    const notification = await Notification.create({
      company_id: req.company_id,
      user_email: payslip.employee_email,
      user_id: payslip.user_id,
      title: 'Payslip Available',
      message: `Your payslip for ${monthName} is ready. Net: ${
        payslip.currency_symbol
      }${Number(payslip.net_salary).toLocaleString('en-IN')}`,
      type: 'salary',
      related_id: payslip._id.toString(),
    });
    emitNotification(payslip.employee_email, notification);
  } catch (err) {
    console.error('[sendPayslip] notification failed:', err.message);
  }

  res.json(payslip);
});

// GET /api/salary/payslips/me
export const getMyPayslips = asyncHandler(async (req, res) => {
  const payslips = await Payslip.find({
    company_id: req.company_id,
    user_id: req.user._id,
  }).sort({
    month: -1,
  });
  res.json(payslips);
});

// GET /api/salary/payslips/:id
export const getPayslip = asyncHandler(async (req, res) => {
  const payslip = await Payslip.findOne({
    _id: req.params.id,
    company_id: req.company_id,
  }).populate('user_id', 'full_name email employee_id department');
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

  if (
    req.user.role !== 'admin' &&
    String(req.user._id) !== String(payslip.user_id?._id || payslip.user_id)
  ) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json(payslip);
});

// GET /api/salary/payslips/:id/pdf — redirects to the hosted PDF URL
export const downloadPayslipPDF = asyncHandler(async (req, res) => {
  const payslip = await Payslip.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

  if (
    req.user.role !== 'admin' &&
    String(req.user._id) !== String(payslip.user_id)
  ) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!payslip.payslip_pdf_url) {
    return res.status(404).json({ error: 'PDF not yet generated' });
  }

  res.redirect(payslip.payslip_pdf_url);
});

// DELETE /api/salary/payslip/:id
export const deletePayslip = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const payslip = await Payslip.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

  if (payslip.status === 'paid') {
    return res
      .status(400)
      .json({ error: 'Cannot delete a paid payslip' });
  }

  await Payslip.findOneAndDelete({ _id: req.params.id, company_id: req.company_id });
  res.json({ message: 'Payslip deleted' });
});

// GET /api/salary/payslips
export const getAllPayslips = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { month, status, user_id } = req.query;
  const filter = { company_id: req.company_id };
  if (month) filter.month = month;
  if (status) filter.status = status;
  if (user_id) filter.user_id = user_id;

  const payslips = await Payslip.find(filter)
    .populate('user_id', 'full_name email employee_id')
    .sort({ month: -1, employee_name: 1 });

  res.json(payslips);
});
