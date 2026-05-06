// ===========================================================================
// AUTO-CHECKOUT CRON
// ---------------------------------------------------------------------------
// Closes attendance sessions for users whose browser tab has stopped sending
// heartbeats (tab closed, browser closed, laptop closed, OS shut down).
//
// Idle time = now - user.last_activity (last heartbeat).
// Threshold comes from AppSettings:
//   - auto_checkout_hours * 3600s (default 2h)
// ===========================================================================

import cron from 'node-cron';
import Attendance from '../models/Attendance.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AppSettings from '../models/AppSettings.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import {
  sendAutoCheckoutEmail,
  sendAutoCheckoutWarningEmail,
} from '../utils/sendEmail.js';

// Close any open AttendanceSession docs and finalize the parent Attendance.
const closeAttendance = async (att, checkoutTime, type = 'auto') => {
  const openSessions = await AttendanceSession.find({
    attendance_id: att._id,
    check_out: { $exists: false },
  });

  for (const session of openSessions) {
    session.check_out = checkoutTime;
    session.duration_minutes = Math.max(
      0,
      Math.round((checkoutTime - session.check_in) / 60000),
    );
    await session.save();
  }

  const allSessions = await AttendanceSession.find({ attendance_id: att._id });
  const totalMin = allSessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0,
  );

  // Fallback to (last_activity - first_check_in) if no session docs exist
  const fallbackHours = att.first_check_in
    ? (checkoutTime - new Date(att.first_check_in)) / 3600000
    : 0;

  att.has_active_session = false;
  att.last_check_out = checkoutTime;
  att.work_hours = parseFloat(
    (totalMin > 0 ? totalMin / 60 : fallbackHours).toFixed(2),
  );
  att.checkout_type = type;
  await att.save();

  return att;
};

const getSocketIO = async () => {
  try {
    const mod = await import('../sockets/index.js');
    return mod.getIO();
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Main pass: scan active sessions, warn or close based on idle seconds.
// ---------------------------------------------------------------------------
export const runAutoCheckout = async () => {
  try {
    const settings = await AppSettings.getSingleton();
    if (!settings.auto_checkout_enabled) return;

    const isTest = false;

    const thresholdSec = settings.auto_checkout_hours * 3600;

    const warningThresholdSec = Math.max(
      60,
      thresholdSec - settings.auto_checkout_warning_minutes * 60,
    );

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const activeAttendance = await Attendance.find({
      date: today,
      has_active_session: true,
      last_check_out: { $exists: false },
    });

    if (!activeAttendance.length) return;

    console.log(
      `🔍 [AutoCheckout] Checking ${activeAttendance.length} active session(s) ` +
        `(threshold=${thresholdSec}s)`,
    );

    const io = await getSocketIO();
    let closedCount = 0;
    let warnedCount = 0;

    for (const att of activeAttendance) {
      try {
        const user = await User.findOne({ email: att.employee_email });
        if (!user) continue;

        // Use the MOST RECENT of last_activity (last heartbeat) and
        // first_check_in. A stale last_activity from a previous session would
        // otherwise instantly auto-check-out a user who just checked in today.
        // NOTE: We deliberately do NOT consider office_end_time here.
        // A user past office_end_time who is still sending heartbeats is
        // working OVERTIME and must NOT be auto-checked-out.
        const lastActivityMs = user.last_activity ? new Date(user.last_activity).getTime() : 0;
        const firstCheckInMs = att.first_check_in ? new Date(att.first_check_in).getTime() : 0;
        const lastSeenMs = Math.max(lastActivityMs, firstCheckInMs);
        if (!lastSeenMs) continue;
        const lastSeen = new Date(lastSeenMs);

        const idleSec = Math.floor((now - new Date(lastSeen)) / 1000);
        const idleMinutes = Math.floor(idleSec / 60);

        // ---- AUTO-CHECKOUT ----
        if (idleSec >= thresholdSec) {
          // Use last heartbeat as the fair checkout time, not "now"
          const checkoutTime = new Date(lastSeen);
          await closeAttendance(att, checkoutTime, 'auto');

          const idleHours = (idleSec / 3600).toFixed(2);

          await Notification.create({
            user_email: user.email,
            user_id: user._id,
            title: 'Auto Check-out',
            message: `You were auto-checked-out after ${idleHours}h of no heartbeat (tab closed). Total: ${att.work_hours} hrs.`,
            type: 'auto_checkout',
            related_id: att._id.toString(),
          });

          try {
            await sendAutoCheckoutEmail(
              user.email,
              user.full_name,
              checkoutTime,
              att.work_hours,
              idleHours,
            );
          } catch (e) {
            console.error('[AutoCheckout] email failed:', e.message);
          }

          if (io) {
            io.to(`user_${user._id}`).emit('auto_checkout', {
              checkoutTime,
              workHours: att.work_hours,
              idleHours,
            });
          }

          user.is_online = false;
          user.auto_checkout_warning_sent = false;
          await user.save();

          closedCount++;
          continue;
        }

        // ---- WARNING ----
        if (idleSec >= warningThresholdSec && !user.auto_checkout_warning_sent) {
          const secondsLeft = Math.max(30, thresholdSec - idleSec);
          const minutesLeft = Math.max(1, Math.ceil(secondsLeft / 60));

          await Notification.create({
            user_email: user.email,
            user_id: user._id,
            title: '⏰ Inactivity Warning',
            message: `Your session will auto-close in ~${minutesLeft} min if your browser tab stays closed.`,
            type: 'auto_checkout_warning',
            related_id: att._id.toString(),
          });

          try {
            await sendAutoCheckoutWarningEmail(
              user.email,
              user.full_name,
              minutesLeft,
            );
          } catch (e) {
            console.error('[AutoCheckout] warning email failed:', e.message);
          }

          if (io) {
            io.to(`user_${user._id}`).emit('auto_checkout_warning', {
              minutesLeft,
              checkoutAt: new Date(now.getTime() + secondsLeft * 1000),
            });
          }

          user.auto_checkout_warning_sent = true;
          await user.save();

          warnedCount++;
        } else {
          console.log(
            `[AutoCheckout] ${user.email}: idle for ${idleMinutes} min — within threshold, skipping`,
          );
        }
      } catch (innerErr) {
        console.error(
          `[AutoCheckout] error processing attendance ${att._id}:`,
          innerErr.message,
        );
      }
    }

    if (closedCount || warnedCount) {
      console.log(
        `✅ [AutoCheckout] closed=${closedCount}, warned=${warnedCount}`,
      );
    }
  } catch (err) {
    console.error('[AutoCheckout] fatal:', err.message);
  }
};

// ---------------------------------------------------------------------------
// Daily reset of the warning flag — runs at midnight daily.
// ---------------------------------------------------------------------------
export const resetWarningFlags = async () => {
  try {
    const result = await User.updateMany(
      { auto_checkout_warning_sent: true },
      { $set: { auto_checkout_warning_sent: false } },
    );
    console.log(
      `🌙 [AutoCheckout] daily reset — cleared ${result.modifiedCount} warning flags`,
    );
  } catch (err) {
    console.error('[AutoCheckout] reset failed:', err.message);
  }
};

// ---------------------------------------------------------------------------
// Schedules.
// ---------------------------------------------------------------------------
let normalTask = null;
let midnightTask = null;
let currentMode = null;

const applyMode = (mode) => {
  if (mode === currentMode) return;
  currentMode = mode;

  if (normalTask) normalTask.stop();
  normalTask = cron.schedule('*/5 * * * *', runAutoCheckout);
  console.log('[AutoCheckout] normal mode running every 5 minutes');
};

export const startAutoCheckoutCron = () => {
  AppSettings.getSingleton()
    .then(() => applyMode('normal'))
    .catch((err) => {
      console.error('[AutoCheckout] could not read settings, defaulting to normal:', err.message);
      applyMode('normal');
    });

  // Daily warning-flag reset at midnight
  midnightTask = cron.schedule('0 0 * * *', resetWarningFlags);

  console.log('Auto-checkout cron started (every 5 min)');
};

export const stopAutoCheckoutCron = () => {
  normalTask?.stop();
  midnightTask?.stop();
};

export default startAutoCheckoutCron;


