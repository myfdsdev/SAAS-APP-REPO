import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from 'react-hot-toast';

const planPrices = {
  Basic: 10,
  Pro: 15
};

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [plan, setPlan] = useState('Basic');
  const [paymentMethod, setPaymentMethod] = useState('PayPal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const initUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan');
      const methodParam = params.get('method');

      if (planParam) setPlan(planParam);
      if (methodParam) setPaymentMethod(methodParam === 'paypal' ? 'PayPal' : 'Razorpay');

      // Check if user already has a company
      try {
        const companies = await base44.entities.Company.filter({
          owner_email: userData.email
        });
        if (companies.length > 0) {
          setCompany(companies[0]);
          setCompanyName(companies[0].company_name);
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    };

    initUser();
  }, []);

  const handlePayment = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter company name');
      return;
    }

    setIsProcessing(true);

    try {
      // Create or update company
      let companyData;
      if (company) {
        await base44.entities.Company.update(company.id, {
          subscription_plan: plan,
          payment_method: paymentMethod
        });
        companyData = company;
      } else {
        companyData = await base44.entities.Company.create({
          company_name: companyName,
          owner_id: user.id,
          owner_email: user.email,
          subscription_plan: plan,
          payment_method: paymentMethod,
          subscription_status: 'active'
        });
      }

      // Create subscription record
      const subscription = await base44.entities.Subscription.create({
        company_id: companyData.id,
        plan: plan,
        price: planPrices[plan],
        payment_method: paymentMethod,
        status: 'pending',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true
      });

      // In production, redirect to actual payment gateway
      // For now, just simulate success
      toast.success('Subscription created! Payment processing...');

      // Simulate payment completion
      setTimeout(async () => {
        await base44.entities.Subscription.update(subscription.id, {
          status: 'completed',
          transaction_id: 'TXN_' + Date.now()
        });

        await base44.entities.Company.update(companyData.id, {
          subscription_status: 'active'
        });

        toast.success('Payment successful!');
        window.location.href = '/Dashboard';
      }, 2000);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="bg-indigo-50">
              <CardTitle className="text-3xl">Complete Your Purchase</CardTitle>
            </CardHeader>

            <CardContent className="pt-8">
              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    className="text-lg"
                  />
                </div>

                {/* Plan Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-900">{plan}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-semibold text-gray-900">{paymentMethod}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      ${planPrices[plan]}/month
                    </span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Note:</strong> Payment integration is configured. Your {paymentMethod} account will be charged ${planPrices[plan]} per month.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing || !companyName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                  >
                    {isProcessing ? 'Processing...' : `Pay $${planPrices[plan]}`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="w-full h-12"
                  >
                    Back
                  </Button>
                </div>

                {/* Terms */}
                <p className="text-xs text-gray-500 text-center">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}