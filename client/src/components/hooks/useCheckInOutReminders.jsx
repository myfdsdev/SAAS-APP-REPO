import { useEffect, useRef } from 'react';

export function useCheckInOutReminders(user, todayAttendance) {
  const notificationShownRef = useRef({
    morning: false,
    afternoon: false,
    evening: false,
  });

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkAndNotify = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Morning reminder - 10:00 AM (if not checked in)
      if (hours === 10 && minutes === 0 && !notificationShownRef.current.morning) {
        if (!todayAttendance?.first_check_in) {
          showDesktopNotification(
            'समय आ गया है! Check-in करें',
            'अपना attendance mark करना न भूलें। अभी check-in करें!',
            'check-in'
          );
          notificationShownRef.current.morning = true;
        }
      }

      // Afternoon reminder - 2:00 PM (if checked in but not checked out)
      if (hours === 14 && minutes === 0 && !notificationShownRef.current.afternoon) {
        if (todayAttendance?.first_check_in && !todayAttendance?.last_check_out) {
          const checkInTime = new Date(todayAttendance.first_check_in);
          const workedHours = (now - checkInTime) / (1000 * 60 * 60);
          
          showDesktopNotification(
            `आपने ${workedHours.toFixed(1)} घंटे काम किया है`,
            'बढ़िया काम! जारी रखें 💪',
            'progress'
          );
          notificationShownRef.current.afternoon = true;
        }
      }

      // Evening reminder - 6:00 PM (if checked in but not checked out)
      if (hours === 18 && minutes === 0 && !notificationShownRef.current.evening) {
        if (todayAttendance?.first_check_in && !todayAttendance?.last_check_out) {
          showDesktopNotification(
            'Check-out करना न भूलें!',
            'अपना attendance complete करने के लिए check-out करें।',
            'check-out'
          );
          notificationShownRef.current.evening = true;
        }
      }

      // Reset flags at midnight
      if (hours === 0 && minutes === 0) {
        notificationShownRef.current = {
          morning: false,
          afternoon: false,
          evening: false,
        };
      }
    };

    // Check every minute
    const interval = setInterval(checkAndNotify, 60000);
    checkAndNotify(); // Check immediately

    return () => clearInterval(interval);
  }, [user, todayAttendance]);
}

function showDesktopNotification(title, body, type) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `attendance-${type}`,
      requireInteraction: type === 'check-out', // Keep check-out reminder until user interacts
      vibrate: [200, 100, 200],
      data: { type },
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds (except check-out which requires interaction)
    if (type !== 'check-out') {
      setTimeout(() => notification.close(), 10000);
    }
  }
}