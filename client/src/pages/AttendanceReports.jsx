import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, FileSpreadsheet, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AttendanceReports() {
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['monthlyAttendance', selectedMonth],
    queryFn: () => {
      const monthDate = new Date(`${selectedMonth}-01`);
      return base44.entities.Attendance.filter({
        date: {
          $gte: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
          $lte: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
        },
      });
    },
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['monthlyLeaveRequests', selectedMonth],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date', 500),
  });

  const generateMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return options;
  };

  const calculateEmployeeStats = (employeeEmail) => {
    const employeeAttendance = attendance.filter(a => a.employee_email === employeeEmail);
    const lateCount = Math.max(0, employeeAttendance.filter(a => a.status === 'late').length);
    const halfDayCount = Math.max(0, employeeAttendance.filter(a => a.status === 'half_day').length);
    const presentCount = Math.max(
      0,
      employeeAttendance.filter(a =>
        ['present', 'late', 'half_day'].includes(a.status)
      ).length
    );
    const attendanceLeaveCount = employeeAttendance.filter(a => a.status === 'on_leave').length;
    const leaveCount = Math.max(
      attendanceLeaveCount,
      countApprovedLeaveDays(employeeEmail, selectedMonth, leaveRequests)
    );
    const totalDays = Math.max(0, employeeAttendance.length);
    const totalHours = Math.max(
      0,
      employeeAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0)
    );
    const avgHours = presentCount > 0 ? (totalHours / presentCount).toFixed(1) : '0';
    const attendancePercentage =
      totalDays > 0
        ? Math.min(100, Math.max(0, (presentCount / totalDays) * 100)).toFixed(1)
        : '0';

    return {
      presentCount,
      lateCount,
      halfDayCount,
      leaveCount,
      totalDays,
      totalHours: totalHours.toFixed(1),
      avgHours,
      attendancePercentage,
    };
  };

  const handleExportPDF = async () => {
    const data = await base44.functions.invoke('exportAttendanceReport', {
      month: selectedMonth,
      format: 'pdf',
    });
    downloadBlob(data, `attendance-report-${selectedMonth}.pdf`, 'application/pdf');
  };

  const handleExportExcel = async () => {
    const data = await base44.functions.invoke('exportAttendanceReport', {
      month: selectedMonth,
      format: 'excel',
    });
    downloadBlob(
      data,
      `attendance-report-${selectedMonth}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  const downloadBlob = (data, filename, mimeType) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-lime-100/35">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-lime-100/50">Only administrators can access attendance reports.</p>
        </div>
      </div>
    );
  }

  const employeeUsers = employees.filter(e => e.role === 'user');

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Attendance Reports
          </h1>
          <p className="text-lime-100/50 mt-1">View and export monthly attendance reports</p>
        </motion.div>

        <Card className="border border-lime-400/15 bg-black mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-lime-100/35" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="gap-2 bg-lime-400 text-black"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  className="gap-2  bg-lime-400 text-black"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-lime-400/15 bg-black">
          <CardHeader>
            <CardTitle className="text-white">Employee Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Half Day</TableHead>
                    <TableHead className="text-center">Leave</TableHead>
                    <TableHead className="text-center">Total Days</TableHead>
                    <TableHead className="text-center">Total Hours</TableHead>
                    <TableHead className="text-center">Avg Hours</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeUsers.map((employee) => {
                    const stats = calculateEmployeeStats(employee.email);
                    const percentage = parseFloat(stats.attendancePercentage);
                    const percentageColor = 
                      percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                      percentage >= 75 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700';

                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.full_name}</p>
                            <p className="text-xs text-lime-100/50">{employee.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{stats.presentCount}</TableCell>
                        <TableCell className="text-center">{stats.lateCount}</TableCell>
                        <TableCell className="text-center">{stats.halfDayCount}</TableCell>
                        <TableCell className="text-center">{stats.leaveCount}</TableCell>
                        <TableCell className="text-center font-medium">{stats.totalDays}</TableCell>
                        <TableCell className="text-center">{stats.totalHours}h</TableCell>
                        <TableCell className="text-center">{stats.avgHours}h</TableCell>
                        <TableCell className="text-center">
                          <Badge className={percentageColor}>
                            {stats.attendancePercentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function countApprovedLeaveDays(employeeEmail, selectedMonth, leaveRequests) {
  const monthStart = startOfMonth(new Date(`${selectedMonth}-01`));
  const monthEnd = endOfMonth(monthStart);

  return leaveRequests
    .filter((leave) => leave.employee_email === employeeEmail && leave.status === 'approved')
    .reduce((sum, leave) => {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      if (leaveEnd < monthStart || leaveStart > monthEnd) return sum;

      const start = leaveStart > monthStart ? leaveStart : monthStart;
      const end = leaveEnd < monthEnd ? leaveEnd : monthEnd;
      const days = Math.floor((end - start) / 86400000) + 1;
      return sum + Math.max(0, days);
    }, 0);
}
