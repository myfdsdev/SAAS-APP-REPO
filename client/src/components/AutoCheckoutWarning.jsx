import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AutoCheckoutWarning({
  minutesLeft,
  checkoutAt,
  onStayActive,
  onDismiss,
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (checkoutAt) {
      return Math.max(0, Math.floor((new Date(checkoutAt) - Date.now()) / 1000));
    }
    return minutesLeft * 60;
  });

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[9999] max-w-sm bg-white border-2 border-amber-300 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Inactivity Warning</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-700">
            You'll be auto-checked out in
          </p>

          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-amber-600">
              {mm}:{ss}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Just move your mouse or click anywhere to stay checked-in.
            </p>
          </div>

          <Button
            onClick={onStayActive}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            I'm still here
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
