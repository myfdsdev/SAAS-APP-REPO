import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useDesktopNotifications(user) {
  useEffect(() => {
    if (!user) return;

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return;
    }

    // Request notification permission
    const requestPermission = async () => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } else {
        console.log('Notification permission status:', Notification.permission);
      }
    };

    requestPermission();

    // Subscribe to notification changes
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === user.email) {
        const notification = event.data;
        
        console.log('New notification received:', notification.title);
        
        // Skip desktop notifications for attendance reminders and check-in/check-out actions
        if (notification.type === 'attendance_reminder' || notification.type === 'check_in') {
          return;
        }
        
        if (Notification.permission === 'granted') {
          // Create notification options
          const options = {
            body: notification.message,
            icon: '/logo.png', // App logo
            badge: '/badge.png',
            requireInteraction: false,
            silent: false,
            tag: notification.id,
            data: {
              notificationId: notification.id,
              relatedId: notification.related_id,
              type: notification.type
            }
          };

          // Add action buttons for message notifications
          if (notification.type === 'new_message') {
            options.actions = [
              { action: 'reply', title: 'Reply' },
              { action: 'mark_read', title: 'Mark as Read' }
            ];
          }

          const desktopNotif = new Notification(notification.title, options);

          // Auto close after 8 seconds
          setTimeout(() => desktopNotif.close(), 8000);

          // Handle notification click
          desktopNotif.onclick = () => {
            window.focus();
            
            // Navigate to relevant page based on notification type
            if (notification.type === 'new_message') {
              window.location.href = '/DirectMessages';
            } else if (notification.type === 'group_added') {
              window.location.href = '/Groups';
            }
            
            desktopNotif.close();
          };
        } else {
          console.log('Notification permission not granted. Current status:', Notification.permission);
        }
      }
    });

    return unsubscribe;
  }, [user]);
}