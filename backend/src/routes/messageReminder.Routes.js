import express from 'express';
import {
  getMyReminders,
  filterReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getDueReminders,
} from '../controllers/messageReminder.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();
router.use(protect, requireCompany);

router.get('/due', getDueReminders);
router.get('/filter', filterReminders);

router.post('/', createReminder);
router.get('/', getMyReminders);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

export default router;
