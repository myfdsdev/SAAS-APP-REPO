import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export function useProjectNotifications(user) {
  const permissionGrantedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        permissionGrantedRef.current = true;
      }
    };

    requestPermission();

    // Subscribe to ProjectMember create events
    const unsubscribe = base44.entities.ProjectMember.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const member = event.data;
        
        // Only show notification if this user was added (and not the creator)
        if (member.user_id === user.id && member.added_by !== user.id) {
          // Store in database for notification bell
          base44.entities.Notification.create({
            user_email: user.email,
            user_id: user.id,
            title: 'New Project Assigned',
            message: `You have been added to the project: ${member.project_name}`,
            type: 'group_added',
            related_id: member.project_id,
          });

          // Show desktop notification
          if (permissionGrantedRef.current && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('New Project Assigned', {
              body: `You have been added to the project: ${member.project_name}`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `project-${member.project_id}`,
              requireInteraction: false,
            });

            // Handle click - navigate to project board
            notification.onclick = () => {
              window.focus();
              window.location.href = createPageUrl('ProjectBoard') + `?projectId=${member.project_id}`;
              notification.close();
            };

            // Auto close after 10 seconds
            setTimeout(() => notification.close(), 10000);
          }
        }
      }
    });

    return unsubscribe;
  }, [user]);
}