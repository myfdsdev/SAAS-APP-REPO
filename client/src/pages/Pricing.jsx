import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Basic",
    price: 10,
    description: "Perfect for small teams",
    features: [
      "Attendance tracking",
      "Leave management",
      "Direct messaging",
      "Group chats",
      "Up to 50 employees",
      "Email support"
    ]
  },
  {
    name: "Pro",
    price: 15,
    description: "For growing organizations",
    features: [
      "All Basic features",
      "Unlimited employees",
      "Advanced reports",
      "Custom branding",
      "API access",
      "Priority support",
      "Team collaboration",
      "Attendance analytics"
    ]
  }
];

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your organization
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <Card className={`border-2 transition-all ${
                plan.name === "Pro" 
                  ? "border-indigo-600 shadow-xl" 
                  : "border-gray-200"
              }`}>
                <CardHeader className={plan.name === "Pro" ? "bg-indigo-50" : ""}>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Button
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`w-full mb-6 ${
                      plan.name === "Pro"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                    }`}
                  >
                    Choose {plan.name}
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods */}
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Complete Your {selectedPlan} Plan
            </h2>
            
            <div className="space-y-4">
              <Button
                onClick={() => window.location.href = `/checkout?plan=${selectedPlan}&method=paypal`}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
              >
                Pay with PayPal
              </Button>
              <Button
                onClick={() => window.location.href = `/checkout?plan=${selectedPlan}&method=razorpay`}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
              >
                Pay with Razorpay
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setSelectedPlan(null)}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}