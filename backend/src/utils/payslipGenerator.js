import PDFDocument from 'pdfkit';
import { uploadToCloudinary } from '../config/cloudinary.js';

const fmt = (currencySymbol, amount) =>
  `${currencySymbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const generatePayslipPDF = async (payslip, user, appSettings) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', async () => {
        try {
          const buf = Buffer.concat(chunks);
          const result = await uploadToCloudinary(buf, 'payslips');
          resolve(result.secure_url);
        } catch (e) {
          reject(e);
        }
      });
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const symbol = payslip.currency_symbol || appSettings.currency_symbol || '₹';
      const monthName = new Date(`${payslip.month}-01`).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric' },
      );

      // ===== Header =====
      if (appSettings.app_logo) {
        try {
          const r = await fetch(appSettings.app_logo);
          const logoBuf = Buffer.from(await r.arrayBuffer());
          doc.image(logoBuf, 50, 40, { width: 56, height: 56 });
        } catch (e) {
          console.warn('Could not load logo:', e.message);
        }
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#111827')
        .text(appSettings.app_name || 'AttendEase', 120, 48);
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#6b7280')
        .text(`PAYSLIP — ${monthName}`, 120, 75);

      doc
        .moveTo(50, 110)
        .lineTo(pageW - 50, 110)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke();

      // ===== Employee info =====
      let y = 130;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text('Employee', 50, y);
      y += 18;

      const lines = [
        ['Name', payslip.employee_name || user.full_name || ''],
        ['Email', payslip.employee_email || user.email || ''],
        ['Employee ID', user.employee_id || 'N/A'],
        ['Department', user.department || 'N/A'],
      ];
      doc.fontSize(10);
      lines.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').fillColor('#6b7280').text(`${label}:`, 50, y, { width: 100 });
        doc.font('Helvetica').fillColor('#111827').text(String(value), 160, y);
        y += 16;
      });

      y += 14;

      // ===== Earnings =====
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text('Earnings', 50, y);
      y += 18;

      const labelX = 50;
      const amountX = pageW - 50 - 120;
      const drawRow = (label, amount, bold = false) => {
        const font = bold ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(font).fontSize(10).fillColor('#111827').text(label, labelX, y, { width: 320 });
        doc
          .font(font)
          .fontSize(10)
          .fillColor('#111827')
          .text(fmt(symbol, amount), amountX, y, { width: 120, align: 'right' });
        y += 16;
      };

      drawRow('Base Salary', payslip.base_salary);
      if (Number(payslip.bonus) > 0) drawRow('Bonus', payslip.bonus);

      doc
        .moveTo(labelX, y + 2)
        .lineTo(pageW - 50, y + 2)
        .strokeColor('#e5e7eb')
        .stroke();
      y += 8;
      drawRow(
        'Subtotal',
        Number(payslip.base_salary || 0) + Number(payslip.bonus || 0),
        true,
      );

      y += 10;

      // ===== Deductions =====
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text('Deductions', 50, y);
      y += 18;

      drawRow('Total Deductions', payslip.deductions, true);

      y += 14;

      // ===== Net Salary box =====
      const boxH = 56;
      doc
        .rect(50, y, pageW - 100, boxH)
        .fill('#ecfccb');
      doc
        .fillColor('#365314')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('NET SALARY', 64, y + 14);
      doc
        .fillColor('#1a2e05')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(fmt(symbol, payslip.net_salary), 50, y + 12, {
          width: pageW - 100 - 14,
          align: 'right',
        });

      y += boxH + 18;

      // ===== Notes =====
      if (payslip.notes && payslip.notes.trim()) {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#111827')
          .text('Notes', 50, y);
        y += 16;
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#374151')
          .text(payslip.notes, 50, y, { width: pageW - 100 });
        y = doc.y + 12;
      }

      // ===== Footer =====
      const footerY = pageH - 70;
      doc
        .moveTo(50, footerY)
        .lineTo(pageW - 50, footerY)
        .strokeColor('#e5e7eb')
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(
          `Generated on ${new Date().toLocaleDateString()} by ${
            payslip.generated_by || 'system'
          }`,
          50,
          footerY + 10,
        );
      doc.text(
        'This is a computer-generated document and does not require a signature.',
        50,
        footerY + 24,
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
