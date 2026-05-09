import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendWelcomeEmail, sendEmail } from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';
import {
  clearExpiredCompanySuspension,
  clearExpiredUserSuspension,
  getCompanyAccessBlock,
  getUserAccessBlock,
} from '../utils/accessControl.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==========================================
// Helper: Build user response object (used everywhere)
// ==========================================
const buildUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  department: user.department,
  employee_id: user.employee_id,
  mobile_number: user.mobile_number,
  profile_photo: user.profile_photo,
  is_online: user.is_online,
  access_status: user.access_status,
  access_reason: user.access_reason,
  suspended_until: user.suspended_until,
  is_profile_complete: user.is_profile_complete,
  company_id: user.company_id,
  company: user.company_id && typeof user.company_id === 'object' ? user.company_id : undefined,
  joined_company_at: user.joined_company_at,
  office_start_time: user.office_start_time,
  office_end_time: user.office_end_time,
  late_threshold_minutes: user.late_threshold_minutes,
  half_day_hours: user.half_day_hours,
  working_days: user.working_days,
  shift_id: user.shift_id,
  total_points: user.total_points,
  current_rank: user.current_rank,
  badges: user.badges,
  last_rank_calc: user.last_rank_calc,
  is_active: user.is_active,
  auth_provider: user.auth_provider,
  last_active: user.last_active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ==========================================
// @desc    Register new user
// @route   POST /api/auth/register
// ==========================================
export const register = asyncHandler(async (req, res) => {
  const { email, password, full_name, department, employee_id, mobile_number } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const role = adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';

  const user = await User.create({
    email: email.toLowerCase(),
    password,
    full_name,
    department: department || '',
    employee_id: employee_id || '',
    mobile_number: mobile_number || '',
    role,
    company_id: null,
    joined_company_at: null,
  });

  // 📧 Send welcome email (single call, fire-and-forget)
  console.log(`🎉 New user registered: ${user.email} — sending welcome email...`);
  sendWelcomeEmail(user.email, user.full_name).catch((err) =>
    console.error('Welcome email failed:', err.message)
  );

  res.clearCookie('refreshToken');

  res.status(201).json({
    message: 'User registered successfully. Please log in to continue.',
    user: buildUserResponse(user),
  });
});

// ==========================================
// @desc    Login user
// @route   POST /api/auth/login
// ==========================================
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  await clearExpiredUserSuspension(user);
  const userAccessBlock = getUserAccessBlock(user);
  if (userAccessBlock) {
    return res.status(403).json({ error: userAccessBlock.message, code: userAccessBlock.code });
  }

  await user.populate('company_id');

  // If the user's active company has been deleted (or is missing entirely),
  // don't block login — silently detach them so they land on the chooser
  // and can pick another workspace from their history.
  if (
    user.company_id &&
    (!user.company_id._id || user.company_id.status === 'deleted')
  ) {
    user.company_id = null;
    user.employee_id = '';
    user.joined_company_at = null;
    if (user.role !== 'super_admin') user.role = 'user';
    await user.save();
  } else if (user.role !== 'super_admin' && user.company_id) {
    await clearExpiredCompanySuspension(user.company_id);
    const companyAccessBlock = getCompanyAccessBlock(user.company_id);
    if (companyAccessBlock) {
      return res.status(403).json({ error: companyAccessBlock.message, code: companyAccessBlock.code });
    }
  }

  user.is_online = true;
  user.last_active = new Date();
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Login successful',
    token: accessToken,
    user: buildUserResponse(user),
  });
});

// ==========================================
// @desc    Google login / sign-up
// @route   POST /api/auth/google
// ==========================================
export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is missing in backend .env' });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload?.sub) {
    return res.status(401).json({ error: 'Invalid Google account' });
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });
  let isNewUser = false;

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!user) {
    user = await User.create({
      email,
      full_name: payload.name || email.split('@')[0],
      profile_photo: payload.picture || '',
      google_id: payload.sub,
      auth_provider: 'google',
      role: adminEmails.includes(email) ? 'admin' : 'user',
      company_id: null,
      joined_company_at: null,
      department: '',
      employee_id: '',
      mobile_number: '',
    });
    isNewUser = true;
  } else {
    if (!user.google_id) user.google_id = payload.sub;
    if (!user.auth_provider) user.auth_provider = 'google';
    if (!user.profile_photo && payload.picture) user.profile_photo = payload.picture;
  }

  await clearExpiredUserSuspension(user);
  const userAccessBlock = getUserAccessBlock(user);
  if (userAccessBlock) {
    return res.status(403).json({ error: userAccessBlock.message, code: userAccessBlock.code });
  }

  await user.populate('company_id');

  // Silently detach if their active company has been deleted/missing.
  if (
    user.company_id &&
    (!user.company_id._id || user.company_id.status === 'deleted')
  ) {
    user.company_id = null;
    user.employee_id = '';
    user.joined_company_at = null;
    if (user.role !== 'super_admin') user.role = 'user';
    await user.save();
  } else if (user.role !== 'super_admin' && user.company_id) {
    await clearExpiredCompanySuspension(user.company_id);
    const companyAccessBlock = getCompanyAccessBlock(user.company_id);
    if (companyAccessBlock) {
      return res.status(403).json({ error: companyAccessBlock.message, code: companyAccessBlock.code });
    }
  }

  user.is_online = true;
  user.last_active = new Date();
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  // 📧 Welcome email for new Google sign-ups
  if (isNewUser) {
    console.log(`🎉 New Google user: ${user.email} — sending welcome email...`);
    sendWelcomeEmail(user.email, user.full_name).catch((err) =>
      console.error('Welcome email failed:', err.message)
    );
  }

  res.json({
    message: 'Google login successful',
    token: accessToken,
    user: buildUserResponse(user),
  });
});

// ==========================================
// @desc    Get current user
// @route   GET /api/auth/me
// ==========================================
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('shift_id')
    .populate('company_id');
  if (!user) return res.status(404).json({ error: 'User not found' });

  // If their active company has been deleted, transparently detach so the
  // frontend redirects to /CompanySetup instead of erroring.
  if (
    user.company_id &&
    (!user.company_id._id || user.company_id.status === 'deleted')
  ) {
    user.company_id = null;
    user.employee_id = '';
    user.joined_company_at = null;
    if (user.role !== 'super_admin') user.role = 'user';
    await user.save();
  } else if (user.role !== 'super_admin' && user.company_id) {
    await clearExpiredCompanySuspension(user.company_id);
    const companyAccessBlock = getCompanyAccessBlock(user.company_id);
    if (companyAccessBlock) {
      return res.status(403).json({ error: companyAccessBlock.message, code: companyAccessBlock.code });
    }
  }

  res.json(buildUserResponse(user));
});

// ==========================================
// @desc    Logout
// @route   POST /api/auth/logout
// ==========================================
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      is_online: false,
      last_active: new Date(),
    });
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// ==========================================
// @desc    Update profile
// @route   PUT /api/auth/update-profile
// ==========================================
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updatableFields = [
    'full_name', 'department', 'employee_id', 'mobile_number', 'profile_photo',
    'office_start_time', 'office_end_time',
    'late_threshold_minutes', 'half_day_hours', 'working_days',
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  if (user.full_name && user.mobile_number && user.department) {
    user.is_profile_complete = true;
  }

  await user.save();

  res.json({
    message: 'Profile updated successfully',
    user: buildUserResponse(user),
  });
});

// ==========================================
// @desc    Change password
// @route   PUT /api/auth/change-password
// ==========================================
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully' });
});

// ==========================================
// @desc    Admin sends a password reset email to a user
// @route   POST /api/users/:id/send-password-reset
// ==========================================
export const sendPasswordResetForUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can trigger password resets' });
  }

  const user = await User.findOne({
    _id: req.params.id,
    company_id: req.company_id || req.user.company_id,
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.auth_provider === 'google') {
    return res.status(400).json({ error: 'Google-authenticated users cannot reset password' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.password_reset_token = hashed;
  user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  const resetUrl = `${frontendUrl}/ResetPassword?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your AttendEase password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password reset requested</h2>
          <p>Hi ${user.full_name || ''},</p>
          <p>An administrator has initiated a password reset for your AttendEase account.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset password</a></p>
          <p style="color:#666;font-size:14px;">This link expires in 1 hour. If you did not expect this, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Password reset email failed:', err.message);
    return res.status(500).json({ error: 'Failed to send reset email' });
  }

  res.json({ message: 'Password reset email sent' });
});

// ==========================================
// @desc    Public — complete password reset using token
// @route   POST /api/auth/reset-password
// ==========================================
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, email, newPassword } = req.body;
  if (!token || !email || !newPassword) {
    return res.status(400).json({ error: 'token, email and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase(),
    password_reset_token: hashed,
    password_reset_expires: { $gt: new Date() },
  }).select('+password +password_reset_token +password_reset_expires');

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

  user.password = newPassword;
  user.password_reset_token = null;
  user.password_reset_expires = null;
  await user.save();

  res.json({ message: 'Password reset successful' });
});

// ==========================================
// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// ==========================================
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = generateAccessToken(decoded.id);
    res.json({ token: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
