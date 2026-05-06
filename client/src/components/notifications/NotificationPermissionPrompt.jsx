import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show prompt if permission is default (not asked yet)
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Show test notification
        new Notification('AttendEase Notifications Enabled! 🎉', {
          body: 'You will now receive desktop notifications for new messages.',
          icon: '/logo.png',
        });
        setShowPrompt(false);
      }
    }
  };

  if (!('Notification' in window)) {
    return null;
  }

  // Don't show if already granted
  if (permission === 'granted' && !showPrompt) {
    return null;
  }

  // Don't show if user closed the prompt
  if (!showPrompt && permission === 'default') {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full mx-4"
        >
          <Card className="shadow-2xl border-2 border-lime-400/10 bg-black">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Enable Desktop Notifications</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Get notified when you receive new messages
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-2 -mr-2"
                  onClick={() => setShowPrompt(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {permission === 'denied' && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <BellOff className="w-6 h-6 text-rose-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-rose-800">
                      <p className="font-bold mb-2 text-base">🚫 Notifications Blocked kar diye hain</p>
                      <p className="text-sm font-medium mb-2">
                        Aapne pehle notifications ko block kar diya tha. Ab manually enable karna hoga:
                      </p>
                      <ol className="text-sm mt-3 space-y-2 list-decimal list-inside bg-white p-3 rounded border border-rose-200">
                        <li className="font-medium">Address bar mein <span className="bg-rose-100 px-1 rounded">🔒 Lock icon</span> par click karein</li>
                        <li className="font-medium">"Notifications" ya "Site Settings" dhundein</li>
                        <li className="font-medium">"Allow" ya "Allowed" select karein</li>
                        <li className="font-medium">Page ko refresh karein (F5 press karein)</li>
                      </ol>
                      <p className="text-xs mt-3 text-rose-600 font-medium">
                        ⚠️ Bina browser settings change kiye notifications nahi chalegi
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {permission === 'default' && (
                <Button 
                  onClick={requestPermission}
                  className="w-full bg-lime-400 text-black hover:bg-lime-400"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setShowPrompt(false)}
                className="w-full text-gray-600 hover:bg-lime-400"
              >
                Maybe Later
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}