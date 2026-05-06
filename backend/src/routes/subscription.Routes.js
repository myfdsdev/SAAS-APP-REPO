import express from 'express';
import {
  createSubscription,
  getSubscriptions,
  filterSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  stripeWebhook,
} from '../controllers/subscription.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();

// Webhook must use raw body — no auth, no JSON parser
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// All other routes
router.use(protect, requireCompany);

router.get('/filter', filterSubscriptions);
router.put('/:id/cancel', cancelSubscription);

router.post('/', createSubscription);
router.get('/', getSubscriptions);
router.get('/:id', getSubscriptionById);
router.put('/:id', updateSubscription);

export default router;
