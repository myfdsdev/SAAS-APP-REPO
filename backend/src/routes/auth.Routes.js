import express from 'express';
import {
  register,
  login,
  googleLogin,
  getMe,
  logout,
  updateProfile,
  changePassword,
  refreshToken,
  resetPassword,
} from '../controllers/auth.Controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth needed)
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh-token', refreshToken);
router.post('/reset-password', resetPassword);

// Protected routes (need JWT token)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;