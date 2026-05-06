import React, { useState, useEffect } from "react";
import { useAppSettings } from "@/lib/AppSettingsContext";
import { Flame, Clock, CheckCircle2 } from "lucide-react";

/**
 * SmartTimer:
 * - BIG DISPLAY: Counts UP from check-in (HH:MM:SS)
 * - After office_end_time → switches to ORANGE/RED "OVERTIME" mode
 * - Not checked in → "--:--:--"
 * - Checked out → shows total hours worked
 */
export default function SmartTimer({
  firstCheckIn,
  lastCheckOut,
  userShift,
  className = "",
}) {
  const { settings } = useAppSettings();
  const [now, setNow] = useState(new Date());

  const effectiveEndTime = userShift?.end_time || settings.office_end_time;
  const shiftLabel = userShift?.name || null;

  // Tick every second (only while active)
  useEffect(() => {
    if (!firstCheckIn || lastCheckOut) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [firstCheckIn, lastCheckOut]);

  const parseTimeToday = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatDuration = (ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  };

  // ============ DETERMINE MODE ============
  let mode = "idle";
  let display = "--:--:--";
  let workedSoFar = "";

  if (!firstCheckIn) {
    // Not checked in
    mode = "idle";
    display = "--:--:--";
  } else if (lastCheckOut) {
    // Already checked out — show total worked hours
    mode = "completed";
    const totalMs = new Date(lastCheckOut) - new Date(firstCheckIn);
    display = formatDuration(totalMs);
  } else {
    // Active session
    const checkInTime = new Date(firstCheckIn);
    const officeEnd = parseTimeToday(effectiveEndTime);
    const totalElapsed = now - checkInTime;

    if (!officeEnd || now < officeEnd) {
      // Still within office hours — count UP normally (blue)
      mode = "working";
      display = formatDuration(totalElapsed);
    } else {
      // Past office end → OVERTIME mode (orange/red)
      mode = "overtime";
      const overtimeMs = now - officeEnd;
      display = formatDuration(overtimeMs);
      workedSoFar = formatDuration(totalElapsed);
    }
  }

  // ============ RENDER ============
  return (
    <div className={`text-center ${className}`}>
      {/* Status Label */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {mode === "idle" && (
          <p className="text-gray-400 text-sm">Not checked in</p>
        )}
        {mode === "working" && (
          <>
            <Clock className="w-4 h-4 text-indigo-500" />
            <p className="text-indigo-500 text-sm font-medium">
              Working{shiftLabel ? ` (${shiftLabel})` : ""}
            </p>
          </>
        )}
        {mode === "overtime" && (
          <>
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <p className="text-orange-500 text-sm font-bold tracking-wide">
              OVERTIME
            </p>
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
          </>
        )}
        {mode === "completed" && (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-green-500 text-sm font-medium">
              Total Hours Today
            </p>
          </>
        )}
      </div>

      {/* Main Big Display */}
      <div
        className={`text-5xl sm:text-6xl font-bold font-mono tracking-tight tabular-nums transition-colors ${
          mode === "overtime"
            ? "text-orange-500"
            : mode === "completed"
              ? "text-green-600"
              : mode === "idle"
                ? "text-gray-400"
                : "text-gray-900"
        }`}
      >
        {display}
      </div>

      {/* Helper text below */}
      {mode === "working" && effectiveEndTime && (
        <p className="text-xs text-gray-400 mt-3">
          Office ends at {formatDisplayTime(effectiveEndTime)}
        </p>
      )}

      {mode === "overtime" && workedSoFar && (
        <p className="text-xs text-gray-500 mt-3">
          Total worked today:{" "}
          <span className="font-mono font-semibold">{workedSoFar}</span>
        </p>
      )}

      {mode === "idle" && (
        <p className="text-xs text-gray-400 mt-3">
          Click "Check In" to start your day
        </p>
      )}
    </div>
  );
}
