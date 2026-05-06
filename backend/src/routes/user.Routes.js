import express from 'express';
import {
  getAllUsers,
  getUserById,
  filterUsers,
  updateUser,
  deleteUser,
  changeUserRole,
  getOnlineUsers,
  getUsersForMessaging,
  inviteUser,
} from '../controllers/user.Controller.js';
import { sendPasswordResetForUser } from '../controllers/auth.Controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();

// All routes require authentication
router.use(protect, requireCompany);

// Specific routes BEFORE :id route (order matters!)
router.get('/online', getOnlineUsers);
router.get('/for-messaging', getUsersForMessaging);
router.get('/filter', filterUsers);

// Admin only
router.post('/invite', adminOnly, inviteUser);
router.put('/:id/role', adminOnly, changeUserRole);
router.post('/:id/send-password-reset', adminOnly, sendPasswordResetForUser);
router.delete('/:id', adminOnly, deleteUser);

// General routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', adminOnly, updateUser);

export default router;
