import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employee_email: { type: String, required: true },
    employee_name: { type: String, required: true },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },

    base_salary: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    net_salary: { type: Number, default: 0 },

    currency: { type: String, default: 'INR' },
    currency_symbol: { type: String, default: '₹' },

    notes: { type: String, default: '' },

    status: {
      type: String,
      enum: ['draft', 'sent', 'paid'],
      default: 'draft',
    },

    payslip_pdf_url: { type: String, default: '' },

    sent_date: { type: Date, default: null },
    paid_date: { type: Date, default: null },

    generated_by: { type: String, default: '' },
    generated_at: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

payslipSchema.index({ company_id: 1, user_id: 1, month: 1 }, { unique: true });
payslipSchema.index({ company_id: 1, month: 1, status: 1 });
payslipSchema.index({ company_id: 1, employee_email: 1, month: 1 });

payslipSchema.pre('save', function (next) {
  this.net_salary =
    Number(this.base_salary || 0) +
    Number(this.bonus || 0) -
    Number(this.deductions || 0);
  next();
});

export default mongoose.model('Payslip', payslipSchema);
