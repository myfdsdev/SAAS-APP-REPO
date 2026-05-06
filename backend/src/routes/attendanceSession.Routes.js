import express from 'express';
import {
  startSession,
  endSession,
  getSessions,
  filterSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from '../controllers/attendanceSession.Controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();
router.use(protect, requireCompany);

router.get('/filter', filterSessions);
router.put('/:id/end', endSession);

router.post('/', startSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
router.put('/:id', adminOnly, updateSession);
router.delete('/:id', adminOnly, deleteSession);

export default router;
