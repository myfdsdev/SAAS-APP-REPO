import Attendance from '../models/Attendance.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import AppSettings from '../models/AppSettings.js';
import {
  sendAutoCheckoutEmail,
  sendAutoCheckoutWarningEmail,
} from '../utils/sendEmail.js';

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
  const totalMin = allSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  att.has_active_session = false;
  att.last_check_out = checkoutTime;
  att.work_hours = parseFloat((totalMin / 60).toFixed(2)) || att.work_hours;
  att.checkout_type = type;
  await att.save();

  return att;
};

// ==========================================
// 5-MINUTE: idle-based auto-checkout + warning
// ==========================================
export const runIdleAutoCheckout = async () => {
  try {
    const settings = await AppSettings.getSingleton();
    if (!settings.auto_checkout_enabled) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const thresholdMin = settings.auto_checkout_hours * 60;
    const warningThresholdMin = thresholdMin - settings.auto_checkout_warning_minutes;

    const activeAttendance = await Attendance.find({
      date: today,
      has_active_session: true,
    });

    if (!activeAttendance.length) return;

    let closedCount = 0;
    let warnedCount = 0;
    let socketIO;
    try {
      const mod = await import('../sockets/index.js');
      socketIO = mod.getIO();
    } catch {
      socketIO = null;
    }

    for (const att of activeAttendance) {
      const user = await User.findOne({ email: att.employee_email });
      if (!user) continue;

      // Use the MOST RECENT of last_activity and first_check_in so a stale
      // last_activity from a previous day doesn't instantly auto-check-out
      // a user who just checked in.
      const lastActivityMs = user.last_activity ? new Date(user.last_activity).getTime() : 0;
      const firstCheckInMs = att.first_check_in ? new Date(att.first_check_in).getTime() : 0;
      const lastSeenMs = Math.max(lastActivityMs, firstCheckInMs);
      if (!lastSeenMs) continue;
      const lastSeen = new Date(lastSeenMs);

      const minutesIdle = Math.floor((now - lastSeen) / 60000);

      if (minutesIdle >= thresholdMin) {
        // Auto-checkout — fair time = last activity
        const checkoutTime = new Date(lastSeen);
        await closeAttendance(att, checkoutTime, 'auto');

        const idleHours = (minutesIdle / 60).toFixed(1);

        await Notification.create({
          user_email: user.email,
          title: 'Auto Check-out',
          message: `You were auto-checked-out due to ${idleHours}h of inactivity. Total: ${att.work_hours} hrs.`,
          type: 'check_out',
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
          console.error('[CRON] Auto-checkout email failed:', e.message);
        }

        if (socketIO) {
          socketIO.to(`user_${user._id}`).emit('auto_checkout_done', {
            checkoutTime,
            workHours: att.work_hours,
            idleHours,
          });
        }

        // Reset warning flag for tomorrow
        user.auto_checkout_warning_sent = false;
        await user.save();

        closedCount++;
      } else if (
        minutesIdle >= warningThresholdMin &&
        !user.auto_checkout_warning_sent
      ) {
        const minutesLeft = Math.max(1, thresholdMin - minutesIdle);

        await Notification.create({
          user_email: user.email,
          title: '⏰ Inactivity Warning',
          message: `You'll be auto-checked-out in ~${minutesLeft} minutes if you remain inactive.`,
          type: 'general',
          related_id: att._id.toString(),
        });

        try {
          await sendAutoCheckoutWarningEmail(user.email, user.full_name, minutesLeft);
        } catch (e) {
          console.error('[CRON] Warning email failed:', e.message);
        }

        if (socketIO) {
          socketIO.to(`user_${user._id}`).emit('auto_checkout_warning', {
            minutesLeft,
            checkoutAt: new Date(now.getTime() + minutesLeft * 60000),
          });
        }

        user.auto_checkout_warning_sent = true;
        await user.save();

        warnedCount++;
      }
    }

    if (closedCount || warnedCount) {
      console.log(
        `[CRON] Idle auto-checkout: closed=${closedCount}, warned=${warnedCount}`,
      );
    }
  } catch (err) {
    console.error('[CRON] Idle auto-checkout error:', err.message);
  }
};

// ==========================================
// MIDNIGHT: close any session still open + reset warning flags
// ==========================================
export const runAutoCheckout = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const activeAttendance = await Attendance.find({
      date: today,
      has_active_session: true,
    });

    let closedCount = 0;
    for (const att of activeAttendance) {
      await closeAttendance(att, now, 'auto');

      await Notification.create({
        user_email: att.employee_email,
        title: 'Auto Check-out',
        message: `You were auto-checked out at ${now.toLocaleTimeString()}. Total: ${att.work_hours} hrs`,
        type: 'check_out',
        related_id: att._id.toString(),
      });
      closedCount++;
    }

    // Reset warning flags for the next day
    await User.updateMany(
      { auto_checkout_warning_sent: true },
      { $set: { auto_checkout_warning_sent: false } },
    );

    console.log(`[CRON] Midnight auto-checkout closed ${closedCount} sessions`);
  } catch (err) {
    console.error('[CRON] Midnight auto-checkout error:', err.message);
  }
};
