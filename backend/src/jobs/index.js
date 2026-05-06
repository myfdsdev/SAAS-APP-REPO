import cron from 'node-cron';
import { runAttendanceReminder } from './attendanceReminderJob.js';
import { runMessageReminderCheck } from './messageReminderJob.js';
import { runAutoCheckout, runIdleAutoCheckout } from './autoCheckoutJob.js';
import { runCalculatePoints } from '../cron/calculatePoints.js';

export const initCronJobs = () => {
  // Attendance reminder: Mon-Fri at 10:30 AM
  cron.schedule('30 10 * * 1-5', () => {
    console.log('[CRON] Running attendance reminder job...');
    runAttendanceReminder();
  });

  // Message reminders: every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runMessageReminderCheck();
  });

  // NOTE: idle auto-checkout is now scheduled by src/cron/autoCheckout.js
  // (started directly from server.js so it runs in dev too, with test-mode support).

  // Midnight auto-checkout (catch-all + reset warning flags): 11:59 PM
  cron.schedule('59 23 * * *', () => {
    console.log('[CRON] Running midnight auto-checkout...');
    runAutoCheckout();
  });

  // Ranking and awards: daily at midnight for the previous day
  cron.schedule('0 0 * * *', () => {
    console.log('[CRON] Calculating attendance points and awards...');
    runCalculatePoints();
  });

  console.log('✅ Cron jobs initialized');
  console.log('   - Attendance reminder: Mon-Fri 10:30 AM');
  console.log('   - Message reminders: every 5 minutes');
  console.log('   - Midnight auto-checkout: daily 11:59 PM');
  console.log('   - Ranking and awards: daily 12:00 AM');
};

export {
  runAttendanceReminder,
  runMessageReminderCheck,
  runAutoCheckout,
  runIdleAutoCheckout,
  runCalculatePoints,
};
