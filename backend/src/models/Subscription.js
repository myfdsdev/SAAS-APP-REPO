import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    required: true,
  },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  payment_method: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'active', 'cancelled', 'expired', 'failed'],
    default: 'pending',
  },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  auto_renew: { type: Boolean, default: true },
  stripe_subscription_id: { type: String, default: '' },
  stripe_payment_intent_id: { type: String, default: '' },
  cancelled_at: { type: Date },
  cancellation_reason: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);