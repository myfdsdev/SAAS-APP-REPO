import express from 'express';
import {
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  assignShiftToUser,
} from '../controllers/shift.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();

router.use(protect, requireCompany);

router.get('/', listShifts);
router.post('/', createShift);
router.put('/assign/:userId', assignShiftToUser);
router.put('/:id', updateShift);
router.delete('/:id', deleteShift);

export default router;
