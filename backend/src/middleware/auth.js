import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
  clearExpiredUserSuspension,
  getUserAccessBlock,
} from '../utils/accessControl.js';

/**
 * Verify JWT token and attach user to req.user
 * Use on any route that requires login
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header: "Bearer xxxxx"
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Also check cookies (for frontend using cookies)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from DB (without password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    await clearExpiredUserSuspension(user);
    const accessBlock = getUserAccessBlock(user);
    if (accessBlock) {
      return res.status(403).json({ error: accessBlock.message, code: accessBlock.code });
    }

    req.user = user; // attach user to request
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

/**
 * Only admins can access this route
 * Use AFTER protect middleware
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

/**
 * Only super admins can access this route
 * Use AFTER protect middleware
 */
export const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ error: 'Super admin access required' });
  }
};

/**
 * Optional auth — attaches user if logged in, but doesn't block if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(); // don't block, just continue without user
  }
};
