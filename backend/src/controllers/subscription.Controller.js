import Subscription from '../models/Subscription.js';
import Company from '../models/Company.js';
import stripe, { createPaymentIntent } from '../config/stripe.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Plan prices
const PLAN_PRICES = {
  free: 0,
  basic: 9.99,
  pro: 29.99,
  enterprise: 99.99,
};

// @desc    Create subscription
// @route   POST /api/subscriptions
// @access  Private
export const createSubscription = asyncHandler(async (req, res) => {
  const { plan, payment_method = 'card', auto_renew = true } = req.body;
  const company_id = req.company_id;

  if (!company_id || !plan) {
    return res.status(400).json({ error: 'company_id and plan required' });
  }

  if (!PLAN_PRICES.hasOwnProperty(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const company = await Company.findById(req.company_id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  // Only owner can subscribe
  if (company.owner_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only company owner can subscribe' });
  }

  const price = PLAN_PRICES[plan];
  const startDate = new Date();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days

  const subscription = await Subscription.create({
    company_id,
    plan,
    price,
    payment_method,
    status: price === 0 ? 'active' : 'pending',
    start_date: startDate,
    end_date: endDate,
    auto_renew,
  });

  // Create Stripe payment intent for paid plans
  let paymentIntent = null;
  if (price > 0) {
    try {
      paymentIntent = await createPaymentIntent({
        amount: price,
        currency: 'usd',
        metadata: {
          subscription_id: subscription._id.toString(),
          company_id: company_id.toString(),
          plan,
        },
      });

      subscription.stripe_payment_intent_id = paymentIntent.id;
      await subscription.save();
    } catch (err) {
      console.error('Stripe error:', err.message);
      // Don't fail, frontend can retry payment
    }
  }

  // Update company
  company.subscription_plan = plan;
  company.subscription_status = price === 0 ? 'active' : 'inactive';
  await company.save();

  res.status(201).json({
    subscription,
    client_secret: paymentIntent?.client_secret || null,
  });
});

// @desc    Get subscriptions
// @route   GET /api/subscriptions
// @access  Private
export const getSubscriptions = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  const subs = await Subscription.find(filter)
    .sort(req.query.sort || '-createdAt')
    .limit(parseInt(req.query.limit) || 100);

  res.json(subs);
});

// @desc    Filter subscriptions (base44 pattern)
// @route   GET /api/subscriptions/filter
// @access  Private
export const filterSubscriptions = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  const subs = await Subscription.find(filter)
    .sort(req.query.sort || '-createdAt')
    .limit(parseInt(req.query.limit) || 100);

  res.json(subs);
});

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Private
export const getSubscriptionById = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json(sub);
});

// @desc    Update subscription (mark as paid, update status, etc)
// @route   PUT /api/subscriptions/:id
// @access  Private
export const updateSubscription = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  delete updates.company_id;
  const sub = await Subscription.findOneAndUpdate(
    { _id: req.params.id, company_id: req.company_id },
    updates,
    { new: true, runValidators: true }
  );
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  // Sync company status if subscription status changed
  if (req.body.status === 'active') {
    await Company.findByIdAndUpdate(req.company_id, {
      subscription_status: 'active',
      subscription_plan: sub.plan,
    });
  }

  res.json(sub);
});

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private
export const cancelSubscription = asyncHandler(async (req, res) => {
  const { cancellation_reason } = req.body;
  const sub = await Subscription.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  sub.status = 'cancelled';
  sub.auto_renew = false;
  sub.cancelled_at = new Date();
  sub.cancellation_reason = cancellation_reason || '';
  await sub.save();

  // Cancel on Stripe if applicable
  if (sub.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      console.error('Stripe cancel error:', err.message);
    }
  }

  // Update company
  await Company.findByIdAndUpdate(req.company_id, {
    subscription_status: 'cancelled',
  });

  res.json(sub);
});

// @desc    Stripe webhook for payment events
// @route   POST /api/subscriptions/webhook
// @access  Public (Stripe only)
export const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const subId = paymentIntent.metadata.subscription_id;
      if (subId) {
        await Subscription.findByIdAndUpdate(subId, { status: 'active' });
        const sub = await Subscription.findById(subId);
        if (sub) {
          await Company.findByIdAndUpdate(sub.company_id, {
            subscription_status: 'active',
          });
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const subId = paymentIntent.metadata.subscription_id;
      if (subId) {
        await Subscription.findByIdAndUpdate(subId, { status: 'failed' });
      }
      break;
    }
    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  res.json({ received: true });
});
