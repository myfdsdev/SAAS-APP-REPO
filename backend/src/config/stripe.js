import Stripe from 'stripe';

let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
  console.log('✅ Stripe configured');
} else {
  console.log('⚠️  Stripe not configured (STRIPE_SECRET_KEY missing) — payment features disabled');
}

// Helper: Create a payment intent
export const createPaymentIntent = async ({ amount, currency = 'usd', metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
};

export const createSubscription = async ({ customerId, priceId }) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
};

export const createStripeCustomer = async ({ email, name, metadata = {} }) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.customers.create({ email, name, metadata });
};

export const cancelSubscription = async (subscriptionId) => {
  if (!stripe) throw new Error('Stripe not configured');
  return await stripe.subscriptions.cancel(subscriptionId);
};

export default stripe;