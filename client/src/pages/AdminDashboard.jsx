import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileSpreadsheet,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Settings,
  Image,
  Palette
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

import StatsCard from '../components/attendance/StatsCard';
import EmployeeList from '../components/admin/EmployeeList';
import AttendanceReportTable from '../components/admin/AttendanceReportTable';
import LeaveRequestList from '../components/leave/LeaveRequestList';
import InviteUserDialog from '../components/admin/InviteUserDialog';

const THEMES = {
  neonGreen: {
    name: "Neon Green",
    bg: "#000000",
    card: "#020806",
    accent: "#a3ff12",
    text: "#ffffff",
    muted: "rgba(236,255,220,0.55)",
    glow: "rgba(163,255,18,0.25)"
  },
  neonRed: {
    name: "Neon Red",
    bg: "#080000",
    card: "#120202",
    accent: "#ff1744",
    text: "#ffffff",
    muted: "rgba(255,220,220,0.55)",
    glow: "rgba(255,23,68,0.25)"
  },
  neonBlue: {
    name: "Neon Blue",
    bg: "#000814",
    card: "#020b18",
    accent: "#00b4ff",
    text: "#ffffff",
    muted: "rgba(220,240,255,0.55)",
    glow: "rgba(0,180,255,0.25)"
  },
  neonPurple: {
    name: "Neon Purple",
    bg: "#090014",
    card: "#12021f",
    accent: "#b026ff",
    text: "#ffffff",
    muted: "rgba(245,220,255,0.55)",
    glow: "rgba(176,38,255,0.25)"
  },
  amberDark: {
    name: "Amber Dark",
    bg: "#050301",
    card: "#120b02",
    accent: "#ffb020",
    text: "#ffffff",
    muted: "rgba(255,238,210,0.55)",
    glow: "rgba(255,176,32,0.25)"
  }
};

const DEFAULT_SETTINGS = {
  appTitle: "Admin Dashboard",
  logoUrl: "",
  themeKey: "neonGreen"
};

function getSavedSettings() {
  try {
    const saved = localStorage.getItem("app_settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  const [appSettings, setAppSettings] = useState(getSavedSettings);
  const activeTheme = THEMES[appSettings.themeKey] || THEMES.neonGreen;

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    document.title = appSettings.appTitle || "Admin Dashboard";
    localStorage.setItem("app_settings", JSON.stringify(appSettings));
  }, [appSettings]);

  const updateAppSetting = (key, value) => {
    setAppSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const { data: allAttendance = [] } = useQuery({
    queryKey: ['allAttendance', dateRange],
    queryFn: () => base44.entities.Attendance.filter({
      date: { $gte: dateRange.start, $lte: dateRange.end }
    }, '-date'),
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const editAttendanceMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can edit attendance');
      }

      const record = allAttendance.find((entry) => entry.id === id);
      const toDateTime = (timeValue) =>
        timeValue && record?.date ? `${record.date}T${timeValue}:00` : null;

      return base44.entities.Attendance.update(id, {
        first_check_in: toDateTime(data.clock_in),
        last_check_out: toDateTime(data.clock_out),
        status: data.status,
        notes: data.notes,
        has_active_session: !!data.clock_in && !data.clock_out,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Attendance updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update attendance');
    },
  });

  const approveLeave = useMutation({
    mutationFn: async (request) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can approve leave requests');
      }

      const updated = await base44.entities.LeaveRequest.update(request.id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];

        const existing = await base44.entities.Attendance.filter({
          employee_email: request.employee_email,
          date: dateStr,
        });

        if (existing.length === 0) {
          await base44.entities.Attendance.create({
            employee_id: request.employee_id,
            employee_email: request.employee_email,
            employee_name: request.employee_name,
            date: dateStr,
            status: 'on_leave',
            notes: `Leave: ${request.leave_type}`,
          });
        }
      }

      await base44.entities.Notification.create({
        user_email: request.employee_email,
        title: 'Leave Request Approved',
        message: `Your ${request.leave_type} leave from ${request.start_date} to ${request.end_date} has been approved.`,
        type: 'leave_approved',
        related_id: request.id,
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendance'] });
    },
  });

  const rejectLeave = useMutation({
    mutationFn: async (request) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can reject leave requests');
      }

      const updated = await base44.entities.LeaveRequest.update(request.id, {
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      await base44.entities.Notification.create({
        user_email: request.employee_email,
        title: 'Leave Request Rejected',
        message: `Your ${request.leave_type} leave from ${request.start_date} to ${request.end_date} has been rejected.`,
        type: 'leave_rejected',
        related_id: request.id,
      });

      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }),
  });

  const totalEmployees = employees.filter(e => e.role === 'user').length;
  const onlineUsers = employees.filter(e => e.is_online).length;
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const lateToday = todayAttendance.filter(a => a.status === 'late').length;
  const halfDayToday = todayAttendance.filter(a => a.status === 'half_day').length;
  const absentToday = totalEmployees - todayAttendance.length;
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: activeTheme.bg }}>
        <div style={{ color: activeTheme.muted }}>Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: activeTheme.bg }}>
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p style={{ color: activeTheme.muted }}>Only administrators can access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: activeTheme.bg,
        color: activeTheme.text
      }}
    >
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 lg:py-8">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            {appSettings.logoUrl ? (
              <img
                src={appSettings.logoUrl}
                alt="App Logo"
                className="w-14 h-14 rounded-2xl object-cover border"
                style={{
                  borderColor: activeTheme.accent,
                  boxShadow: `0 0 30px ${activeTheme.glow}`
                }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold"
                style={{
                  background: activeTheme.card,
                  border: `1px solid ${activeTheme.accent}`,
                  color: activeTheme.accent,
                  boxShadow: `0 0 30px ${activeTheme.glow}`
                }}
              >
                A
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold">{appSettings.appTitle}</h1>
              <p className="mt-1" style={{ color: activeTheme.muted }}>
                Comprehensive attendance and leave management
              </p>
            </div>
          </div>
        </motion.div>

    

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatsCard title="Total Employees" value={totalEmployees} icon={Users} color="indigo" delay={0.1} />
          <StatsCard title="Online Now" value={onlineUsers} subtitle={`${totalEmployees - onlineUsers} offline`} icon={Wifi} color="green" delay={0.15} />
          <StatsCard title="Present" value={presentToday} icon={CheckCircle2} color="emerald" delay={0.2} />
          <StatsCard title="Late" value={lateToday} icon={Clock} color="amber" delay={0.3} />
          <StatsCard title="Half Day" value={halfDayToday} icon={Clock} color="blue" delay={0.4} />
          <StatsCard title="Absent" value={absentToday} icon={AlertCircle} color="rose" delay={0.5} />
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList
            className="border-1 border-lime-400/10 p-1 rounded-xl"
            style={{
              background: activeTheme.card,
            }}
          >
            <TabsTrigger value="employees" className="rounded-lg px-4">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>

            <TabsTrigger value="attendance" className="rounded-lg px-4">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>

            <TabsTrigger value="leaves" className="rounded-lg px-4">
              <Calendar className="w-4 h-4 mr-2" />
              Leaves
              {pendingLeaves > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingLeaves}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent  value="employees">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm" style={{ color: activeTheme.muted }}>
                {totalEmployees} team member{totalEmployees !== 1 ? 's' : ''} • {onlineUsers} online
              </p>

              <Button
                onClick={() => setInviteDialogOpen(true)}
                style={{
                  background: activeTheme.accent,
                  color: "#000"
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                Invite Team Member
              </Button>
            </div>

            <EmployeeList employees={employees} todayAttendance={todayAttendance} />
          </TabsContent>

          <TabsContent value="attendance">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: activeTheme.muted }}>From:</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-40 bg-black/40 text-white border-white/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: activeTheme.muted }}>To:</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-40 bg-black/40 text-white border-white/10"
                />
              </div>
            </div>

            <AttendanceReportTable
              attendance={allAttendance}
              onEdit={(id, data) => editAttendanceMutation.mutate({ id, data })}
              isEditing={editAttendanceMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="leaves">
            <LeaveRequestList
              requests={leaveRequests}
              isAdmin={true}
              onApprove={(request) => approveLeave.mutate(request)}
              onReject={(request) => rejectLeave.mutate(request)}
            />
          </TabsContent>
        </Tabs>

        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </div>
    </div>
  );
}
