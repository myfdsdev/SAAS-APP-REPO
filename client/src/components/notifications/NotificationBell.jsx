import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

function formatNotificationDate(dateValue) {
  if (!dateValue) return '';

  try {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return '';

    return format(
      toZonedTime(parsedDate, 'Asia/Kolkata'),
      'MMM d, h:mm a'
    );
  } catch {
    return '';
  }
}

export default function NotificationBell({ userEmail, notificationType = null }) {
  const queryClient = useQueryClient();
  const notificationQueryKey = ['notifications', userEmail, notificationType];

  const { data: notifications = [] } = useQuery({
    queryKey: notificationQueryKey,
    queryFn: async () => {
      if (!userEmail) return [];

      if (notificationType) {
        return await base44.entities.Notification.filter(
          {
            user_email: userEmail,
            type: notificationType,
          },
          '-created_date',
          50
        );
      }

      return await base44.entities.Notification.filter(
        { user_email: userEmail },
        '-created_date',
        50
      );
    },
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (!userEmail) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const notif = event.data;

        if (
          notif?.user_email === userEmail &&
          (!notificationType || notif?.type === notificationType)
        ) {
          queryClient.invalidateQueries({ queryKey: notificationQueryKey });
        }
      }
    });

    return unsubscribe;
  }, [userEmail, notificationType, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKey }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n) => !n.is_read);

      await Promise.all(
        unreadNotifications.map((n) =>
          base44.entities.Notification.update(n.id, { is_read: true })
        )
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKey }),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 rounded-2xl border border-lime-400/15 bg-[#061006]/80/40 hover:bg-[#061006]/80 text-white"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-rose-500 text-white text-[10px] rounded-full border border-lime-400/15">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] rounded-2xl border border-lime-400/15 bg-[#020806]/90 text-white p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-semibold text-white">Notifications</p>
            <p className="text-xs text-lime-100/55">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-lime-300 hover:text-lime-300 hover:bg-[#061006]/80"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? 'Updating...' : 'Mark all read'}
            </Button>
          )}
        </div>

        <DropdownMenuSeparator className="bg-[#061006]/80 m-0" />

        <div className="max-h-96 overflow-y-auto hide-scrollbar">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-lime-100/55 text-sm">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`px-4 py-4 cursor-pointer border-b border-lime-400/15/70 last:border-b-0 focus:bg-lime-400/10 ${
                  !notification.is_read ? 'bg-lime-400/5' : 'bg-transparent'
                }`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsReadMutation.mutate(notification.id);
                  }
                }}
              >
                <div className="flex w-full items-start gap-3">
                  <div
                    className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                      !notification.is_read ? 'bg-lime-400' : 'bg-lime-400/20'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-5 ${
                        !notification.is_read
                          ? 'font-semibold text-white'
                          : 'font-medium text-white'
                      }`}
                    >
                      {notification.title}
                    </p>

                    <p className="text-xs text-lime-100/55 mt-1 leading-5 break-words">
                      {notification.message}
                    </p>

                    <p className="text-[11px] text-lime-100/45 mt-2">
                      {formatNotificationDate(notification.created_date)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}