import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';
import {
  getEmployeesWithSalaryStatus,
  upsertPayslip,
  sendPayslip,
  getMyPayslips,
  getPayslip,
  downloadPayslipPDF,
  deletePayslip,
  getAllPayslips,
} from '../controllers/salary.Controller.js';

const router = express.Router();

router.use(protect, requireCompany);

router.get('/employees', getEmployeesWithSalaryStatus);

router.post('/payslip', upsertPayslip);
router.put('/payslip/:id/send', sendPayslip);
router.delete('/payslip/:id', deletePayslip);

router.get('/payslips', getAllPayslips);
router.get('/payslips/me', getMyPayslips);
router.get('/payslips/:id/pdf', downloadPayslipPDF);
router.get('/payslips/:id', getPayslip);

export default router;
