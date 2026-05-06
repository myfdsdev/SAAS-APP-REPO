import express from 'express';
import {
  createLeaveRequest,
  getMyLeaves,
  getAllLeaves,
  filterLeaves,
  getLeaveById,
  approveLeave,
  rejectLeave,
  updateLeave,
  deleteLeave,
  getLeaveStats,
} from '../controllers/leave.Controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();

router.use(protect, requireCompany);

// Specific routes FIRST
router.get('/me', getMyLeaves);
router.get('/stats', getLeaveStats);
router.get('/filter', filterLeaves);

// Admin actions
router.put('/:id/approve', adminOnly, approveLeave);
router.put('/:id/reject', adminOnly, rejectLeave);

// General CRUD
router.post('/', createLeaveRequest);
router.get('/', getAllLeaves);
router.get('/:id', getLeaveById);
router.put('/:id', updateLeave);
router.delete('/:id', deleteLeave);

export default router;
