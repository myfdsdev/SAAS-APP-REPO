import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, FileText, MapPin, Camera, Bell, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const onboardingSteps = [
  {
    icon: Clock,
    title: "Welcome to Office Attendance Manager",
    description: "Track your attendance, manage leaves, and stay connected with your team - all in one place.",
    features: [
      "Quick check-in and check-out",
      "Real-time attendance tracking",
      "Automated notifications"
    ]
  },
  {
    icon: Calendar,
    title: "Leave Management Made Easy",
    description: "Apply for leaves and get instant approvals. Stay updated on your leave balance.",
    features: [
      "Multiple leave types (Sick, Casual, Paid)",
      "Quick approval workflow",
      "Leave history at your fingertips"
    ]
  },
  {
    icon: FileText,
    title: "Comprehensive Reports",
    description: "View your attendance history, work hours, and performance insights.",
    features: [
      "Monthly attendance reports",
      "Work hour tracking",
      "Export to PDF and Excel"
    ]
  },
  {
    icon: MapPin,
    title: "Permissions Required",
    description: "To provide the best experience, we need access to:",
    features: [
      "Location - For attendance verification",
      "Camera - For profile photo",
      "Notifications - For timely updates"
    ],
    isPermissions: true
  }
];

export default function OnboardingScreen({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = onboardingSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 bg-white shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div className="space-y-3 mb-8">
              {step.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg"
                >
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${step.isPermissions ? 'text-amber-600' : 'text-emerald-600'}`} />
                  <p className="text-gray-700 text-sm">{feature}</p>
                </motion.div>
              ))}
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2 mb-6">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-indigo-600'
                      : index < currentStep
                      ? 'w-2 bg-indigo-400'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {currentStep < onboardingSteps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  Get Started
                </Button>
              )}
            </div>

            {currentStep < onboardingSteps.length - 1 && (
              <button
                onClick={handleSkip}
                className="w-full text-center mt-4 text-gray-500 text-sm hover:text-gray-700"
              >
                Skip Tutorial
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}