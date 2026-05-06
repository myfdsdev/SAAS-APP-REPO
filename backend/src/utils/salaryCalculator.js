import User from '../models/User.js';
import SalaryConfig from '../models/SalaryConfig.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import AppSettings from '../models/AppSettings.js';

/**
 * Calculate salary for a user for a specific month
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<Object>} Calculated salary breakdown
 */
export const calculateSalaryForUser = async (userId, month, companyId = null) => {
  try {
    // Fetch necessary data
    const user = await User.findOne({
      _id: userId,
      ...(companyId ? { company_id: companyId } : {}),
    });
    if (!user) throw new Error('User not found');
    const tenantId = companyId || user.company_id;

    const salaryConfig = await SalaryConfig.findOne({ company_id: tenantId, user_id: userId });
    if (!salaryConfig) {
      throw new Error('Salary configuration not found for this user');
    }

    const appSettings = await AppSettings.getForCompany(tenantId);

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    // Format dates as YYYY-MM-DD for database queries
    const startDateStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    // Fetch attendance for the month
    const attendance = await Attendance.find({
      company_id: tenantId,
      employee_email: user.email,
      date: { $gte: startDateStr, $lte: endDateStr },
    });

    // Fetch approved leave requests for the month
    const leaveRequests = await LeaveRequest.find({
      company_id: tenantId,
      employee_email: user.email,
      status: 'approved',
      start_date: { $lte: endDateStr },
      end_date: { $gte: startDateStr },
    });

    // Calculate attendance summary
    const days_present = attendance.filter((a) => a.status === 'present').length;
    const days_late = attendance.filter((a) => a.status === 'late').length;
    const days_half_day = attendance.filter((a) => a.status === 'half_day').length;
    const days_absent = attendance.filter((a) => a.status === 'absent').length;

    // Calculate paid and unpaid leaves
    let paid_leaves = 0;
    let unpaid_leaves = 0;

    leaveRequests.forEach((leave) => {
      // Count only leaves within the month
      const leaveStart = Math.max(
        new Date(leave.start_date),
        startDate
      );
      const leaveEnd = Math.min(
        new Date(leave.end_date),
        endDate
      );

      const leaveDays = Math.ceil(
        (leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)
      ) + 1;

      if (leave.leave_type === 'unpaid') {
        unpaid_leaves += leaveDays;
      } else {
        paid_leaves += leaveDays;
      }
    });

    // Calculate work hours from attendance
    let total_work_hours = 0;
    attendance.forEach((record) => {
      if (record.work_hours) {
        total_work_hours += record.work_hours;
      } else if (record.first_check_in && record.last_check_out) {
        const hours =
          (new Date(record.last_check_out) - new Date(record.first_check_in)) /
          (1000 * 60 * 60);
        total_work_hours += hours;
      }
    });

    // Salary calculations
    const base_salary = salaryConfig.base_salary;
    const { hra = 0, travel = 0, other = 0 } = salaryConfig.allowances || {};
    const bonus = salaryConfig.bonuses || 0;

    const working_days = appSettings.working_days_per_month || 22;
    const standard_hours = appSettings.standard_hours_per_day || 8;
    const expected_hours = working_days * standard_hours;
    const overtime_hours = Math.max(0, total_work_hours - expected_hours);

    const per_day_rate = base_salary / working_days;
    const per_hour_rate = per_day_rate / standard_hours;
    const overtime_rate = appSettings.overtime_rate_per_hour || per_hour_rate;

    const overtime_pay =
      overtime_hours *
      overtime_rate *
      (appSettings.overtime_multiplier || 1);

    const late_deduction = days_late * (appSettings.late_penalty || 0);
    const half_day_deduction = days_half_day * (appSettings.half_day_deduction || 0);
    const absent_deduction = days_absent * per_day_rate;
    const unpaid_leave_deduction = unpaid_leaves * per_day_rate;

    const total_allowances = hra + travel + other;
    const gross_salary = base_salary + total_allowances + overtime_pay + bonus;
    const total_deductions =
      late_deduction +
      half_day_deduction +
      absent_deduction +
      unpaid_leave_deduction;
    const net_salary = gross_salary - total_deductions;

    return {
      user_id: userId,
      company_id: tenantId,
      employee_email: user.email,
      employee_name: user.full_name,
      month,
      currency: appSettings.currency,

      // Earnings
      base_salary,
      allowances: { hra, travel, other },
      overtime_hours: Math.round(overtime_hours * 100) / 100,
      overtime_pay: Math.round(overtime_pay * 100) / 100,
      bonus,

      // Attendance Summary
      days_worked: days_present + days_late + days_half_day,
      days_present,
      days_late,
      days_half_day,
      days_absent,
      paid_leaves,
      unpaid_leaves,

      // Deductions
      late_deduction: Math.round(late_deduction * 100) / 100,
      half_day_deduction: Math.round(half_day_deduction * 100) / 100,
      absent_deduction: Math.round(absent_deduction * 100) / 100,
      unpaid_leave_deduction: Math.round(unpaid_leave_deduction * 100) / 100,
      total_deductions: Math.round(total_deductions * 100) / 100,

      // Summary
      gross_salary: Math.round(gross_salary * 100) / 100,
      net_salary: Math.round(net_salary * 100) / 100,
    };
  } catch (error) {
    console.error('Error calculating salary:', error);
    throw error;
  }
};

/**
 * Calculate salary for all users with salary config for a month
 */
export const calculateSalariesForMonth = async (month, companyId) => {
  try {
    const salaryConfigs = await SalaryConfig.find({ company_id: companyId }).populate('user_id');
    const results = [];

    for (const config of salaryConfigs) {
      if (config.user_id) {
        const calc = await calculateSalaryForUser(config.user_id._id.toString(), month, companyId);
        results.push(calc);
      }
    }

    return results;
  } catch (error) {
    console.error('Error calculating bulk salaries:', error);
    throw error;
  }
};
