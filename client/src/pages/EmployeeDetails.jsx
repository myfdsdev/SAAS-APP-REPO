import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Shield, User, Clock, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import StatsCard from '../components/attendance/StatsCard';
import AttendanceHistory from '../components/attendance/AttendanceHistory';
import LeaveRequestList from '../components/leave/LeaveRequestList';
import ManageUserCard from '../components/admin/ManageUserCard';
import HoursChart from '../components/charts/HoursChart';
import StatusPieChart from '../components/charts/StatusPieChart';
import AttendanceChart from '../components/charts/AttendanceChart';

export default function EmployeeDetails() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: employeeId });
      return users[0];
    },
    enabled: !!employeeId,
  });

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['employeeAttendance', employee?.email],
    queryFn: () => base44.entities.Attendance.filter({ employee_email: employee.email }, '-date', 30),
    enabled: !!employee?.email,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['employeeLeaves', employee?.email],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_email: employee.email }, '-created_date', 10),
    enabled: !!employee?.email,
  });

  const { data: analytics } = useQuery({
    queryKey: ['employeeAnalytics', employeeId],
    queryFn: () => base44.analytics.user(employeeId),
    enabled: !!employeeId && currentUser?.role === 'admin',
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const thisMonthAttendance = attendance.filter(a =>
    a.date?.startsWith(format(new Date(), 'yyyy-MM'))
  );
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.find(a => a.date === todayKey);
  const presentDays = thisMonthAttendance.filter(a => a.status === 'present').length;
  const absentDays = thisMonthAttendance.filter(a => a.status === 'absent').length;
  const totalHours = thisMonthAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0);
  const approvedLeaves = leaveRequests.filter(l => l.status === 'approved').length;
  const todayWorked = formatWorkedTime(todayAttendance, now);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-lime-100/35">Loading...</div>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Access Denied</h2>
          <p className="text-lime-100/50 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loadingEmployee || !employee) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-lime-100/35">Loading employee data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to={createPageUrl("AdminDashboard")}>
            <Button variant="ghost" className="mb-4 text-lime-100/65 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <Card className="border border-lime-400/15 bg-black">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 bg-lime-400/15 text-lime-300">
                  {employee.profile_photo ? (
                    <AvatarImage src={employee.profile_photo} alt={employee.full_name} />
                  ) : (
                    <AvatarFallback className="bg-lime-400/15 text-lime-300 text-2xl font-semibold">
                      {getInitials(employee.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {employee.full_name}
                  </h1>
                  <p className="text-lime-100/50 flex items-center justify-center md:justify-start gap-2 mt-2">
                    <Mail className="w-4 h-4" />
                    {employee.email}
                  </p>
                  {employee.department && (
                    <p className="text-lime-100/50 text-sm mt-1">{employee.department} - {employee.employee_id}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                    {employee.role === 'admin' ? (
                      <span className="inline-flex items-center rounded-xl border border-lime-400/25 bg-lime-400/10 px-3 py-1.5 text-sm font-semibold text-lime-300 shadow-[0_0_18px_rgba(163,211,18,0.12)]">
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-xl border border-lime-400/15 bg-[#061006]/80 px-3 py-1.5 text-sm font-semibold text-lime-100/75">
                        <User className="w-3.5 h-3.5 mr-1.5 text-lime-300" />
                        Employee
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-xl border border-lime-400/10 bg-black px-3 py-1.5 text-sm font-medium text-lime-100/50">
                      {employee.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {currentUser?.role === 'admin' && (
          <div className="mb-6">
            <ManageUserCard
              employee={employee}
              onUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
                queryClient.invalidateQueries({ queryKey: ['employees'] });
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Today Worked"
            value={todayWorked.value}
            subtitle={todayWorked.subtitle}
            icon={Clock}
            color="green"
            delay={0.05}
          />
          <StatsCard
            title="Present Days"
            value={presentDays}
            subtitle="This month"
            icon={CheckCircle2}
            color="green"
            delay={0.1}
          />
          <StatsCard
            title="Total Hours"
            value={totalHours.toFixed(1)}
            subtitle="This month"
            icon={Clock}
            color="indigo"
            delay={0.2}
          />
          <StatsCard
            title="Absent Days"
            value={absentDays}
            subtitle="This month"
            icon={XCircle}
            color="rose"
            delay={0.3}
          />
          <StatsCard
            title="Approved Leaves"
            value={approvedLeaves}
            subtitle="All time"
            icon={Calendar}
            color="blue"
            delay={0.4}
          />
        </div>

        {analytics && (
          <>
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <HoursChart data={analytics.charts?.hoursPerDay || []} />
              <StatusPieChart data={analytics.charts?.statusBreakdown || []} />
            </div>
            <div className="mb-6">
              <AttendanceChart
                trend={analytics.charts?.monthlyTrend || []}
                heatmap={analytics.charts?.heatmap || []}
              />
            </div>
          </>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <AttendanceHistory attendance={attendance} />
          <LeaveRequestList requests={leaveRequests} />
        </div>
      </div>
    </div>
  );
}

function formatWorkedTime(attendance, now) {
  if (!attendance?.first_check_in) {
    return { value: '0h 0m', subtitle: 'Not checked in today' };
  }

  const start = new Date(attendance.first_check_in);
  const end = attendance.last_check_out ? new Date(attendance.last_check_out) : now;
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    value: `${hours}h ${minutes}m`,
    subtitle: attendance.last_check_out ? 'Completed today' : 'Working now',
  };
}
