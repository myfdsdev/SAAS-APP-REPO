import MessageReminder from '../models/MessageReminder.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

export const runMessageReminderCheck = async () => {
  try {
    const now = new Date();

    const due = await MessageReminder.find({
      is_triggered: false,
      reminder_time: { $lte: now },
    });

    if (!due.length) return;

    let triggered = 0;
    for (const reminder of due) {
      const user = await User.findById(reminder.user_id);
      if (!user) continue;

      const notification = await Notification.create({
        user_email: user.email,
        title: 'Message Reminder',
        message: `Reminder: ${reminder.message_text.substring(0, 100)}`,
        type: 'general',
        related_id: reminder.message_id.toString(),
      });

      reminder.is_triggered = true;
      reminder.triggered_at = new Date();
      await reminder.save();

      try {
        getIO().to(`user_${user._id}`).emit('reminder_triggered', notification);
      } catch {}

      triggered++;
    }

    console.log(`[CRON] Triggered ${triggered} message reminders`);
  } catch (err) {
    console.error('[CRON] Message reminder error:', err.message);
  }
};