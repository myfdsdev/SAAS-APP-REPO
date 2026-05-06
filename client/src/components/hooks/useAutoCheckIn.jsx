import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export function useAutoCheckIn(user) {
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const attemptAutoCheckIn = async () => {
      if (!user || hasAttemptedRef.current) return;
      
      hasAttemptedRef.current = true;
      
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Check backend for existing attendance today
        const existingAttendance = await base44.entities.Attendance.filter({
          employee_email: user.email,
          date: today
        });
        
        // If attendance exists and already checked out, do NOT auto check-in again
        if (existingAttendance && existingAttendance.length > 0) {
          const attendance = existingAttendance[0];
          if (attendance.last_check_out) {
            console.log('Already checked out today - no auto check-in');
            return;
          }
          // If already checked in (has active session), just return
          if (attendance.has_active_session) {
            console.log('Already checked in today - session active');
            return;
          }
        }
        
        // Auto check-in only if no attendance for today
        if (!existingAttendance || existingAttendance.length === 0) {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const totalMinutes = hours * 60 + minutes;
          
          // Determine status based on check-in time (same logic as manual check-in)
          let status = 'present';
          if (totalMinutes > 615) { // After 10:15 AM
            status = 'late';
          }
          
          // Create attendance record with auto check-in
          await base44.entities.Attendance.create({
            employee_id: user.id,
            employee_email: user.email,
            employee_name: user.full_name,
            date: today,
            first_check_in: now.toISOString(),
            status: status,
            has_active_session: true,
            location: 'Auto Check-In'
          });
          
          console.log('Auto check-in successful');
          
          // Notify user
          const clockInTime = format(now, 'HH:mm');
          await base44.entities.Notification.create({
            user_email: user.email,
            title: 'Auto Check-in Successful',
            message: `You were automatically checked in at ${clockInTime}`,
            type: 'check_in',
          });
        }
      } catch (error) {
        console.error('Auto check-in failed:', error);
      }
    };

    attemptAutoCheckIn();
  }, [user]);
}