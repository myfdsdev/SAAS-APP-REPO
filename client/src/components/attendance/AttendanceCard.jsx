import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function AttendanceCard({ todayAttendance, onClockIn, onClockOut, isLoading }) {
  const isClockIn = todayAttendance?.first_check_in;
  const isClockOut = todayAttendance?.last_check_out;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0 shadow-xl shadow-indigo-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {isClockOut ? "Great work today!" : isClockIn ? "You're on the clock" : "Ready to start?"}
            </h2>
            
            <div className="flex flex-wrap gap-4 text-sm">
              {isClockIn && (
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <LogIn className="w-4 h-4" />
                  <span>In: {format(new Date(todayAttendance.first_check_in), "HH:mm")}</span>
                </div>
              )}
              {isClockOut && (
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <LogOut className="w-4 h-4" />
                  <span>Out: {format(new Date(todayAttendance.last_check_out), "HH:mm")}</span>
                </div>
              )}
              {todayAttendance?.work_hours && (
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <Clock className="w-4 h-4" />
                  <span>{todayAttendance.work_hours.toFixed(1)} hrs</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {!isClockIn && (
              <Button
                onClick={onClockIn}
                disabled={isLoading}
                className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-6 py-6 text-base rounded-xl shadow-lg"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Clock In
              </Button>
            )}
            {isClockIn && !isClockOut && (
              <Button
                onClick={onClockOut}
                disabled={isLoading}
                className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-6 py-6 text-base rounded-xl shadow-lg"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Clock Out
              </Button>
            )}
            {isClockOut && (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl px-6 py-4">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Completed</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
