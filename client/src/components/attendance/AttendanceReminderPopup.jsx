import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle } from "lucide-react";

export default function AttendanceReminderPopup({ isOpen, onDismiss, onCheckIn }) {
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    setVisible(isOpen);
  }, [isOpen]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  const handleCheckIn = () => {
    setVisible(false);
    onCheckIn();
  };

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle>Check-In Reminder</DialogTitle>
          </div>
          <DialogDescription>
            आप अभी तक चेक इन नहीं किए हैं। कृपया अपना उपस्थिति रिकॉर्ड करने के लिए चेक इन करें।
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-semibold mb-1">आपको अभी चेक इन करना होगा</p>
              <p className="text-xs">आपकी उपस्थिति के लिए यह महत्वपूर्ण है। अब चेक इन करने के लिए बटन दबाएं।</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            बाद में रिमाइंड करें
          </Button>
          <Button
            onClick={handleCheckIn}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            अभी चेक इन करें
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}