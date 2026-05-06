import express from 'express';
import { protect } from '../middleware/auth.js';
import { heartbeat, getActivityStatus } from '../controllers/activity.Controller.js';

const router = express.Router();

router.post('/heartbeat', protect, heartbeat);
router.get('/status', protect, getActivityStatus);

export default router;
