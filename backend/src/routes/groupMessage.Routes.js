import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  sendGroupMessage,
  getGroupMessages,
  filterGroupMessages,
  editGroupMessage,
  deleteGroupMessage,
  markGroupMessageRead,
} from '../controllers/groupMessage.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();
router.use(protect, requireCompany);

const groupMessageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Message rate limit exceeded. Please slow down.' },
});

router.get('/filter', filterGroupMessages);

router.post('/', groupMessageSendLimiter, sendGroupMessage);
router.get('/', getGroupMessages);
router.put('/:id/read', markGroupMessageRead);
router.put('/:id', editGroupMessage);
router.delete('/:id', deleteGroupMessage);

export default router;
