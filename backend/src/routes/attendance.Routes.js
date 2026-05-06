import express from 'express';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  getAllAttendance,
  filterAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  createAttendance,
  getAttendanceStats,
} from '../controllers/attendance.Controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();

router.use(protect, requireCompany);

// Specific routes FIRST (before :id)
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/me', getMyAttendance);
router.get('/today', getTodayAttendance);
router.get('/stats', getAttendanceStats);
router.get('/filter', filterAttendance);

// Admin routes
router.post('/',createAttendance);
router.put('/:id', adminOnly, updateAttendance);
router.delete('/:id', adminOnly, deleteAttendance);

// General
router.get('/', getAllAttendance);
router.get('/:id', getAttendanceById);

export default router;
