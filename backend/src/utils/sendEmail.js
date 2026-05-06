import SibApiV3Sdk from "sib-api-v3-sdk";
import apiInstance from "../config/email.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!apiInstance) {
    console.log(`⚠️  Email skipped (Brevo not configured): ${subject} → ${to}`);
    return null;
  }

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || "AttendEase";

  if (!fromEmail) {
    console.error(`❌ Cannot send email: SMTP_FROM not set!`);
    return null;
  }

  try {
    console.log(`📤 Sending via Brevo API to ${to}...`);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text || html.replace(/<[^>]*>/g, "");
    sendSmtpEmail.sender = { name: fromName, email: fromEmail };
    sendSmtpEmail.to = [{ email: to }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent! ID: ${result.body?.messageId || "unknown"}`);
    return result;
  } catch (error) {
    console.error(`❌ Email send error:`, error.message);
    if (error.response?.body) {
      console.error(`   Brevo response:`, JSON.stringify(error.response.body));
    }
    throw error;
  }
};

export const sendWelcomeEmail = async (to, name) => {
  return sendEmail({
    to,
    subject: "Welcome to AttendEase! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #3B82F6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to AttendEase!</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}! 👋</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Your account has been successfully created. We're excited to have you on board!
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You can now log in and start tracking attendance, managing projects, and connecting with your team.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173"}/Welcome"
               style="background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Login Now
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you have any questions, just reply to this email — we're here to help.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} AttendEase. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
};

export const sendCompanyInviteEmail = async (
  toEmail,
  fromAdminName,
  companyName,
  inviteLink,
  inviteCode,
) => {
  return sendEmail({
    to: toEmail,
    subject: `${fromAdminName} invited you to join ${companyName} on AttendEase`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #111827, #6366f1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <p style="color: #c7d2fe; margin: 0 0 8px 0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">AttendEase Invitation</p>
          <h1 style="color: white; margin: 0; font-size: 26px;">Join ${companyName}</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #111827; font-size: 16px;">Hi,</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${fromAdminName} invited you to join <strong>${companyName}</strong> on AttendEase, where your team manages attendance, leaves, projects, messages, and payroll in one place.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${inviteLink}" style="background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin: 22px 0;">
            <p style="color: #6b7280; margin: 0 0 6px 0; font-size: 13px;">Manual invite code</p>
            <p style="color: #111827; font-size: 28px; letter-spacing: 0.16em; font-weight: bold; margin: 0;">${inviteCode}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If the button does not work, open AttendEase and choose "Join Existing Company", then enter the code above.
          </p>
        </div>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (to, resetLink) => {
  return sendEmail({
    to,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937;">Password Reset Request</h1>
        <p style="color: #4b5563; font-size: 16px;">Click the button below to reset your password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" style="background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const sendFeedbackEmail = async ({ to, feedback, user }) => {
  const submittedAt = new Date(feedback.createdAt || Date.now()).toLocaleString();
  const frontendUrl =
    process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";

  return sendEmail({
    to,
    subject: `New feedback: ${feedback.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
        <div style="background:#111827; padding:28px; border-radius:12px 12px 0 0;">
          <p style="color:#a3e635; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px 0;">OfficeFlow Feedback</p>
          <h1 style="color:#ffffff; margin:0; font-size:24px;">${escapeHtml(feedback.subject)}</h1>
        </div>
        <div style="background:#ffffff; padding:28px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px;">
          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:18px;">
            <tr><td style="color:#6b7280; padding:5px 0;">From</td><td style="color:#111827; font-weight:600; text-align:right;">${escapeHtml(user.full_name)} (${escapeHtml(user.email)})</td></tr>
            <tr><td style="color:#6b7280; padding:5px 0;">Category</td><td style="color:#111827; font-weight:600; text-align:right; text-transform:capitalize;">${escapeHtml(feedback.category)}</td></tr>
            <tr><td style="color:#6b7280; padding:5px 0;">Priority</td><td style="color:#111827; font-weight:600; text-align:right; text-transform:capitalize;">${escapeHtml(feedback.priority)}</td></tr>
            <tr><td style="color:#6b7280; padding:5px 0;">Rating</td><td style="color:#111827; font-weight:600; text-align:right;">${Number(feedback.rating || 0)}/5</td></tr>
            <tr><td style="color:#6b7280; padding:5px 0;">Submitted</td><td style="color:#111827; font-weight:600; text-align:right;">${escapeHtml(submittedAt)}</td></tr>
          </table>

          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:18px; margin:20px 0;">
            <p style="color:#111827; line-height:1.6; white-space:pre-wrap; margin:0;">${escapeHtml(feedback.message)}</p>
          </div>

          <p style="color:#4b5563; font-size:14px;">
            Contact allowed: <strong>${feedback.allow_contact ? "Yes" : "No"}</strong>
          </p>

          <div style="text-align:center; margin:26px 0 4px 0;">
            <a href="${frontendUrl}/Feedback" style="background:#111827; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;">
              Open Feedback Inbox
            </a>
          </div>
        </div>
      </div>
    `,
  });
};

export const sendAutoCheckoutEmail = async (to, name, checkoutTime, workHours, idleHours) => {
  return sendEmail({
    to,
    subject: 'You were auto-checked out due to inactivity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Auto Check-out</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #1f2937; font-size: 16px;">Hi ${name},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We detected you were inactive for <strong>${idleHours} hours</strong>, so we automatically checked you out.
          </p>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Check-out time:</strong> ${new Date(checkoutTime).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Total hours worked:</strong> ${workHours} hrs</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Your check-out time is recorded as your last detected activity, not when the system noticed.
            If this was a mistake, please contact your administrator.
          </p>
        </div>
      </div>
    `,
  });
};

export const sendAutoCheckoutWarningEmail = async (to, name, minutesLeft) => {
  return sendEmail({
    to,
    subject: `⚠️ You will be auto-checked out in ${minutesLeft} minutes`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">⏰ Inactivity Warning</h2>
        <p style="color: #1f2937;">Hi ${name},</p>
        <p style="color: #4b5563;">
          You haven't been active for a while. To stay checked-in, just move your mouse or click anywhere in AttendEase within the next <strong>${minutesLeft} minutes</strong>.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Otherwise we'll automatically check you out using your last activity time.
        </p>
      </div>
    `,
  });
};

export const sendLeaveApprovalEmail = async (
  to,
  name,
  leaveType,
  startDate,
  endDate,
  status,
) => {
  const isApproved = status === "approved";
  return sendEmail({
    to,
    subject: `Leave Request ${isApproved ? "Approved ✅" : "Rejected ❌"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${isApproved ? "#10b981" : "#ef4444"};">
          Your leave request has been ${status}
        </h1>
        <p style="color: #4b5563; font-size: 16px;">Hi ${name},</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
          <p style="margin: 5px 0;"><strong>From:</strong> ${startDate}</p>
          <p style="margin: 5px 0;"><strong>To:</strong> ${endDate}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> 
            <span style="color: ${isApproved ? "#10b981" : "#ef4444"}; font-weight: bold; text-transform: uppercase;">
              ${status}
            </span>
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          ${
            isApproved
              ? "Your leave has been added to the calendar. Enjoy your time off!"
              : "If you have questions, please contact your administrator."
          }
        </p>
      </div>
    `,
  });
};

export const sendPayslipEmail = async (user, payslip, pdfUrl) => {
  const monthName = new Date(`${payslip.month}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const symbol = payslip.currency_symbol || '₹';
  const fmt = (n) =>
    `${symbol}${Number(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const bonusRow =
    Number(payslip.bonus) > 0
      ? `<tr><td style="color:#4b5563;padding:4px 0;">Bonus</td><td style="text-align:right;color:#111827;font-weight:600;">${fmt(payslip.bonus)}</td></tr>`
      : '';
  const deductionsRow =
    Number(payslip.deductions) > 0
      ? `<tr><td style="color:#4b5563;padding:4px 0;">Deductions</td><td style="text-align:right;color:#dc2626;font-weight:600;">- ${fmt(payslip.deductions)}</td></tr>`
      : '';
  const notesBlock =
    payslip.notes && payslip.notes.trim()
      ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:18px 0;">
            <p style="margin:0 0 6px 0;font-size:13px;color:#92400e;font-weight:bold;">Notes from Admin</p>
            <p style="margin:0;color:#78350f;font-size:14px;line-height:1.5;">${payslip.notes}</p>
         </div>`
      : '';

  return sendEmail({
    to: user.email,
    subject: `Your salary for ${monthName} is ready`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #a3d312, #84cc16); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #1a2e05; margin: 0; font-size: 26px;">💰 Payslip — ${monthName}</h1>
          <p style="color: rgba(26,46,5,0.85); margin: 8px 0 0 0; font-size: 15px;">Your salary for ${monthName} is ready</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #111827; font-size: 16px; margin: 0 0 8px 0;">Hi ${user.full_name || payslip.employee_name},</p>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            Your salary for <strong>${monthName}</strong> has been processed. The summary is below — your full payslip is attached as a PDF.
          </p>

          <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 22px; margin: 22px 0; text-align: center;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 6px 0; letter-spacing: 0.08em;">NET SALARY</p>
            <p style="color: #15803d; font-size: 34px; font-weight: bold; margin: 0;">${fmt(payslip.net_salary)}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 18px 0;">
            <tr><td style="color:#4b5563;padding:4px 0;">Base Salary</td><td style="text-align:right;color:#111827;font-weight:600;">${fmt(payslip.base_salary)}</td></tr>
            ${bonusRow}
            ${deductionsRow}
          </table>

          ${notesBlock}

          <div style="text-align: center; margin: 28px 0;">
            <a href="${pdfUrl}"
               style="background:#a3d312;color:#1a2e05;padding:14px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold;font-size:15px;">
              📄 Download Payslip PDF
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            If anything looks off, please reply to this email or contact your admin.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} AttendEase. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
};

export const sendSalaryPaidEmail = async (
  to,
  employeeName,
  month,
  netSalary,
  paymentMethod,
  transactionId,
  paidDate,
  payslipUrl,
  currencySymbol = '₹'
) => {
  const monthName = new Date(`${month}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return sendEmail({
    to,
    subject: `Your Salary for ${monthName} has been Paid ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💰 Payment Received</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your salary has been successfully credited</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #1f2937; font-size: 16px;">Hi ${employeeName},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We're pleased to inform you that your salary for <strong>${monthName}</strong> has been paid.
          </p>

          <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; border: 2px solid #bbf7d0; margin: 20px 0;">
            <div style="text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">NET SALARY</p>
              <p style="color: #10b981; font-size: 36px; font-weight: bold; margin: 0;">
                ${currencySymbol}${netSalary.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Payment Details:</h3>
            <p style="margin: 10px 0; color: #4b5563;">
              <strong>Payment Method:</strong> ${paymentMethod || 'N/A'}
            </p>
            ${
              transactionId
                ? `<p style="margin: 10px 0; color: #4b5563;">
              <strong>Transaction ID:</strong> ${transactionId}
            </p>`
                : ''
            }
            <p style="margin: 10px 0; color: #4b5563;">
              <strong>Paid Date:</strong> ${new Date(paidDate).toLocaleDateString()}
            </p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${payslipUrl}"
               style="background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              📄 Download Payslip
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Your detailed payslip is available for download. It includes a complete breakdown of your earnings, deductions, and net salary.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} AttendEase. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
};
