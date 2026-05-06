import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subMonths,
  subDays,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
} from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Calendar,
  Clock,
  Filter,
  Timer,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Flame,
  Activity,
} from "lucide-react";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import AttendanceHistory from "../components/attendance/AttendanceHistory";

const THEME = {
  bg: "#000000",
  surface: "#040700",
  surface2: "#070b00",
  border: "#1B211A",
  borderSoft: "#1c2505",
  accent: "#a3d312",
  accentSoft: "#b7ea20",
  accentTextDark: "#0a0d00",
  muted: "#8a9472",
  muted2: "#66704f",
  text: "#f4f7ea",
  danger: "#ff6b6b",
};

const glassCard =
  "rounded-[2rem] border border-[#1B211A] bg-[#000000]/90 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)]";

const miniCard =
  "rounded-[1.4rem] border border-[#1B211A] bg-[#000000]/80 backdrop-blur-xl shadow-[0_0_30px_rgba(163,211,18,0.04)]";

function rangeButtonClass(isActive) {
  return isActive
    ? "border-[#a3d312] bg-[#a3d312] text-black shadow-[0_0_26px_rgba(163,211,18,0.35)]"
    : "border-[#1B211A] bg-[#070b00] text-[#8a9472] hover:border-[#a3d312]/40 hover:text-[#f4f7ea]";
}

function statusButtonClass(isActive) {
  return isActive
    ? "border-[#a3d312] bg-[#a3d312] text-black shadow-[0_0_20px_rgba(163,211,18,0.25)]"
    : "border-[#1B211A] bg-[#070b00] text-[#8a9472] hover:border-[#a3d312]/40 hover:text-[#f4f7ea]";
}

function SkeletonCard() {
  return (
    <div className={`${glassCard} animate-pulse p-5`}>
      <div className="flex items-start justify-between">
        <div className="w-full space-y-3">
          <div className="h-3 w-24 rounded bg-[#1B211A]" />
          <div className="h-8 w-20 rounded bg-[#1B211A]" />
          <div className="h-3 w-32 rounded bg-[#1B211A]" />
        </div>
        <div className="h-10 w-10 rounded-2xl bg-[#1B211A]" />
      </div>
    </div>
  );
}

function InsightPill({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#1B211A] bg-[#070b00]/80 px-3 py-2 text-sm">
      <Icon className="h-4 w-4 text-[#a3d312]" />
      <span className="text-[#8a9472]">{label}</span>
      <span className="font-bold text-[#f4f7ea]">{value}</span>
    </div>
  );
}

function MetricCard({ title, value, subtitle, trend, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={`${glassCard} relative overflow-hidden`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,211,18,0.12),transparent_34%)]" />

        <CardContent className="relative p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a9472]">
                {title}
              </p>

              <div className="flex items-end gap-2">
                <h3 className="text-[32px] font-black leading-none tracking-tight text-[#f4f7ea] drop-shadow-[0_0_18px_rgba(163,211,18,0.20)]">
                  {value}
                </h3>

                {trend ? (
                  <span className="rounded-full border border-[#a3d312]/20 bg-[#a3d312]/10 px-2 py-1 text-xs font-bold text-[#a3d312]">
                    {trend}
                  </span>
                ) : null}
              </div>

              <p className="text-sm text-[#66704f]">{subtitle}</p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#1B211A] bg-[#a3d312]/10 text-[#a3d312]">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AttendanceHistoryPage() {
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("month");

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const monthRange = useMemo(() => {
    const baseDate = new Date(`${selectedMonth}-01`);
    return {
      start: startOfMonth(baseDate),
      end: endOfMonth(baseDate),
    };
  }, [selectedMonth]);

  const activeDateRange = useMemo(() => {
    const now = new Date();

    if (rangeFilter === "7d") {
      return { start: subDays(now, 6), end: now };
    }

    if (rangeFilter === "30d") {
      return { start: subDays(now, 29), end: now };
    }

    return monthRange;
  }, [rangeFilter, monthRange]);

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["myFullAttendance", user?.email, selectedMonth, rangeFilter],
    queryFn: async () => {
      if (!user?.email) return [];

      const start = format(activeDateRange.start, "yyyy-MM-dd");
      const end = format(activeDateRange.end, "yyyy-MM-dd");

      return await base44.entities.Attendance.filter(
        {
          employee_email: user.email,
          date: {
            $gte: start,
            $lte: end,
          },
        },
        "-date"
      );
    },
    enabled: !!user?.email,
  });

  const previousMonthRange = useMemo(() => {
    const previousDate = subMonths(new Date(`${selectedMonth}-01`), 1);

    return {
      start: format(startOfMonth(previousDate), "yyyy-MM-dd"),
      end: format(endOfMonth(previousDate), "yyyy-MM-dd"),
    };
  }, [selectedMonth]);

  const { data: previousMonthAttendance = [] } = useQuery({
    queryKey: ["previousMonthAttendance", user?.email, selectedMonth],
    queryFn: async () => {
      if (!user?.email) return [];

      return await base44.entities.Attendance.filter(
        {
          employee_email: user.email,
          date: {
            $gte: previousMonthRange.start,
            $lte: previousMonthRange.end,
          },
        },
        "-date"
      );
    },
    enabled: !!user?.email,
  });

  const filteredAttendance = useMemo(() => {
    return statusFilter === "all"
      ? attendance
      : attendance.filter((a) => a.status === statusFilter);
  }, [attendance, statusFilter]);

  const presentDays = Math.max(
    0,
    filteredAttendance.filter((a) =>
      ["present", "late", "half_day"].includes(a.status)
    ).length
  );

  const lateDays = Math.max(
    0,
    filteredAttendance.filter((a) => a.status === "late").length
  );

  const halfDays = Math.max(
    0,
    filteredAttendance.filter((a) => a.status === "half_day").length
  );

  const totalHours = Math.max(
    0,
    filteredAttendance.reduce(
      (sum, a) => sum + (a.work_hours || a.total_work_hours || 0),
      0
    )
  );

  const avgHours = presentDays > 0 ? (totalHours / presentDays).toFixed(1) : "0.0";

  const previousPresentDays = Math.max(
    0,
    previousMonthAttendance.filter((a) =>
      ["present", "late", "half_day"].includes(a.status)
    ).length
  );

  const presentDiff = presentDays - previousPresentDays;

  const presentTrend =
    presentDiff > 0 ? `↑ +${presentDiff}` : presentDiff < 0 ? `↓ ${presentDiff}` : "→ 0";

  const totalRecords = filteredAttendance.length;

  const consistencyScore =
    totalRecords > 0 ? Math.round((presentDays / totalRecords) * 100) : 0;

  const performanceLabel =
    consistencyScore >= 80
      ? "Excellent"
      : consistencyScore >= 65
      ? "Good"
      : consistencyScore >= 45
      ? "Average"
      : "Needs Attention";

  const graphData = useMemo(() => {
    const dayCount =
      differenceInCalendarDays(activeDateRange.end, activeDateRange.start) + 1;

    return Array.from({ length: dayCount }).map((_, index) => {
      const day = subDays(activeDateRange.end, dayCount - 1 - index);
      const key = format(day, "yyyy-MM-dd");
      const entry = attendance.find((a) => a.date === key);

      return {
        day: format(day, dayCount > 10 ? "dd MMM" : "EEE"),
        hours: Number(entry?.work_hours || entry?.total_work_hours || 0),
      };
    });
  }, [attendance, activeDateRange]);

  const generateMonthOptions = () => {
    const options = [];

    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);

      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }

    return options;
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-[#a3d312]">
        <div className="w-full max-w-5xl space-y-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-8 w-60 rounded bg-[#1B211A]" />
            <div className="h-4 w-72 rounded bg-[#1B211A]" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <div className={`${glassCard} animate-pulse p-6`}>
            <div className="h-10 w-full rounded-2xl bg-[#1B211A]" />
          </div>

          <div className={`${glassCard} animate-pulse p-6`}>
            <div className="h-64 w-full rounded-2xl bg-[#1B211A]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-10 text-[#f4f7ea]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(163,211,18,0.12),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(183,234,32,0.08),transparent_30%),linear-gradient(135deg,#000000_0%,#040700_45%,#000000_100%)]" />
      <div className="pointer-events-none fixed left-[-12%] top-[20%] -z-10 h-80 w-80 rounded-full bg-[#a3d312]/10 blur-[100px]" />
      <div className="pointer-events-none fixed right-[-10%] top-[-10%] -z-10 h-96 w-96 rounded-full bg-[#b7ea20]/10 blur-[120px]" />

      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`${glassCard} p-5 md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-[#f4f7ea] md:text-4xl">
                  Attendance{" "}
                  <span className="text-[#a3d312] drop-shadow-[0_0_22px_rgba(163,211,18,0.25)]">
                    History
                  </span>
                </h1>

                <p className="mt-2 text-sm leading-6 text-[#8a9472] md:text-[15px]">
                  Review your performance, work consistency, and attendance trends.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <InsightPill
                  icon={Flame}
                  label="Performance"
                  value={performanceLabel}
                />
                <InsightPill
                  icon={TrendingUp}
                  label="Consistency"
                  value={`${consistencyScore}%`}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Present Days"
            value={presentDays}
            subtitle={`Showed up · ${lateDays} late, ${halfDays} half-day`}
            trend={presentTrend}
            icon={Calendar}
            delay={0.05}
          />

          <MetricCard
            title="Total Hours"
            value={totalHours.toFixed(1)}
            subtitle="Tracked work hours"
            trend={
              rangeFilter === "7d"
                ? "Last 7 Days"
                : rangeFilter === "30d"
                ? "Last 30 Days"
                : "Selected Month"
            }
            icon={Timer}
            delay={0.1}
          />

          <MetricCard
            title="Avg. Hours"
            value={avgHours}
            subtitle="Average per present day"
            trend={
              consistencyScore >= 80
                ? "Strong"
                : consistencyScore >= 60
                ? "Stable"
                : "Low"
            }
            icon={Clock}
            delay={0.15}
          />
        </div>

        <Card className={`${glassCard} overflow-hidden`}>
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight text-[#f4f7ea]">
                  Control Panel
                </h3>
                <p className="mt-1 text-sm text-[#8a9472]">
                  Switch range and filter records quickly.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1B211A] bg-[#a3d312]/10">
                  <Filter className="h-4 w-4 text-[#a3d312]" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "7d", label: "Last 7 Days" },
                    { value: "30d", label: "Last 30 Days" },
                    { value: "month", label: "This Month" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setRangeFilter(item.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${rangeButtonClass(
                        rangeFilter === item.value
                      )}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_auto]">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "present", label: "Present" },
                  { value: "late", label: "Late" },
                  { value: "absent", label: "Absent" },
                  { value: "half_day", label: "Half Day" },
                  { value: "on_leave", label: "Leave" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setStatusFilter(item.value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${statusButtonClass(
                      statusFilter === item.value
                    )}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-center gap-3 lg:w-[240px]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#1B211A] bg-[#a3d312]/10">
                  <Calendar className="h-4 w-4 text-[#a3d312]" />
                </div>

                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full rounded-xl border-[#1B211A] bg-[#070b00] font-bold text-[#f4f7ea] focus:ring-[#a3d312]/20">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="border-[#1B211A] bg-[#040700] text-[#f4f7ea]">
                    {generateMonthOptions().map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="focus:bg-[#a3d312]/10 focus:text-[#a3d312]"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardContent className="p-5 md:p-6">
            <div className="mb-5">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-[#f4f7ea]">
                <Activity className="h-5 w-5 text-[#a3d312]" />
                Work Hour Trend
              </h3>

              <p className="mt-1 text-sm text-[#8a9472]">
                Visual breakdown of tracked hours across the selected range.
              </p>
            </div>

            <div className="h-[360px]">
              {isLoading ? (
                <div className="h-full animate-pulse rounded-2xl bg-[#1B211A]/60" />
              ) : graphData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-[#1B211A] bg-[#070b00]/70 px-6 text-center text-sm text-[#8a9472]">
                  No attendance records found for this range. Try switching to
                  another month or changing filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={graphData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="workHoursFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME.accent}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME.accent}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(163,211,18,0.10)"
                    />

                    <XAxis
                      dataKey="day"
                      stroke="#66704f"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="#66704f"
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#040700",
                        border: "1px solid #1B211A",
                        borderRadius: 16,
                        color: "#f4f7ea",
                      }}
                      labelStyle={{
                        color: "#a3d312",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke={THEME.accent}
                      strokeWidth={3}
                      fill="url(#workHoursFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassCard} overflow-hidden`}>
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-black text-[#f4f7ea]">
                  Detailed Logs
                </h3>
                <p className="mt-1 text-sm text-[#8a9472]">
                  Review filtered attendance records and session details.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#1B211A] bg-[#070b00]/80 px-3 py-2 text-sm font-bold text-[#f4f7ea]">
                <BarChart3 className="h-4 w-4 text-[#a3d312]" />
                <span>{filteredAttendance.length} Records</span>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl border border-[#1B211A] bg-[#070b00]/60"
                  />
                ))}
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1B211A] bg-[#070b00]/60 px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1B211A] bg-[#a3d312]/10">
                  <AlertCircle className="h-5 w-5 text-[#a3d312]" />
                </div>

                <h4 className="mb-2 font-bold text-[#f4f7ea]">
                  No attendance records found
                </h4>

                <p className="mx-auto max-w-md text-sm text-[#8a9472]">
                  Try changing the range, month, or status filter to see more
                  results.
                </p>
              </div>
            ) : (
              <div className={`${miniCard} p-3`}>
                <AttendanceHistory attendance={filteredAttendance} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
