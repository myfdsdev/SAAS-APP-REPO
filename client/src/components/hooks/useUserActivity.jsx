import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const ACTIVITY_INTERVAL = 30000; // Update every 30 seconds
const INACTIVITY_THRESHOLD = 15 * 60 * 1000; // 15 minutes for auto checkout

export function useUserActivity(user) {
  const activityTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const updateOnlineStatus = async (isOnline) => {
    if (!user?.email) return;
    
    try {
      await base44.auth.updateMe({
        is_online: isOnline,
        last_active_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  };

  const autoCheckOut = async () => {
    if (!user?.id) return;
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Find active sessions
      const activeSessions = await base44.entities.AttendanceSession.filter({
        employee_id: user.id,
        date: today,
        is_active: true
      });
      
      if (activeSessions && activeSessions.length > 0) {
        const checkOutTime = new Date(lastActivityRef.current).toISOString();
        
        for (const session of activeSessions) {
          // Calculate session duration
          const checkInTime = new Date(session.check_in_time);
          const checkOutTimeDate = new Date(checkOutTime);
          const durationHours = (checkOutTimeDate - checkInTime) / (1000 * 60 * 60);
          
          // Update session
          await base44.entities.AttendanceSession.update(session.id, {
            check_out_time: checkOutTime,
            session_duration: durationHours,
            is_active: false,
            check_out_reason: 'auto_inactive'
          });
        }
        
        // Recalculate attendance
        await base44.functions.invoke('calculateAttendance', {
          employee_id: user.id,
          date: today
        });
        
        console.log('Auto check-out due to inactivity');
      }
    } catch (error) {
      console.error('Auto check-out failed:', error);
    }
  };

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      updateOnlineStatus(false);
      autoCheckOut();
    }, INACTIVITY_THRESHOLD);
  };

  const handleActivity = () => {
    resetInactivityTimer();
  };

  useEffect(() => {
    if (!user?.email) return;

    // Set user as online when component mounts
    updateOnlineStatus(true);

    // Set up periodic activity updates
    activityTimerRef.current = setInterval(() => {
      updateOnlineStatus(true);
    }, ACTIVITY_INTERVAL);

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial inactivity timer
    resetInactivityTimer();

    // Handle page visibility change
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        updateOnlineStatus(false);
        // Don't auto checkout on visibility change, only on prolonged inactivity
      } else {
        updateOnlineStatus(true);
        resetInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload (PC shutdown, browser close)
    const handleBeforeUnload = async () => {
      if (!user?.id) return;
      
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const activeSessions = await base44.entities.AttendanceSession.filter({
          employee_id: user.id,
          date: today,
          is_active: true
        });
        
        if (activeSessions && activeSessions.length > 0) {
          const checkOutTime = new Date().toISOString();
          
          for (const session of activeSessions) {
            const checkInTime = new Date(session.check_in_time);
            const checkOutTimeDate = new Date(checkOutTime);
            const durationHours = (checkOutTimeDate - checkInTime) / (1000 * 60 * 60);
            
            await base44.entities.AttendanceSession.update(session.id, {
              check_out_time: checkOutTime,
              session_duration: durationHours,
              is_active: false,
              check_out_reason: 'auto_shutdown'
            });
          }
          
          // Recalculate attendance
          await base44.functions.invoke('calculateAttendance', {
            employee_id: user.id,
            date: today
          });
        }
      } catch (error) {
        console.error('Error during beforeunload:', error);
      }
      
      // Use sendBeacon for reliable status update
      navigator.sendBeacon('/api/user/status', JSON.stringify({
        is_online: false,
        last_active_time: new Date().toISOString(),
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline when unmounting
      updateOnlineStatus(false);
    };
  }, [user?.email, user?.id]);
}