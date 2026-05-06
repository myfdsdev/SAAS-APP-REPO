import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Search,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Filter,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  format,
  formatDistanceToNow,
  isAfter,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';

import LeaveRequestForm from '../components/leave/LeaveRequestForm';
import LeaveRequestList from '../components/leave/LeaveRequestList';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function SkeletonCard() {
  return (
    <div className="rounded-[1.75rem] border border-lime-400/15 bg-[#020806]/90 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="h-3 w-24 rounded bg-[#061006]/80" />
          <div className="h-8 w-20 rounded bg-[#061006]/80" />
          <div className="h-3 w-32 rounded bg-[#061006]/80" />
        </div>
        <div className="h-11 w-11 rounded-2xl bg-[#061006]/80 shrink-0" />
      </div>
    </div>
  );
}

function Banner({ type = 'success', message }) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-medium",
        type === 'success'
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/20 bg-rose-500/10 text-rose-300"
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        )}
        <span className="break-words">{message}</span>
      </div>
    </div>
  );
}

function InsightTile({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: "bg-lime-400/10 border-lime-400/20 text-lime-300",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    slate: "bg-[#061006]/80/60 border-lime-400/20 text-lime-100/75",
  };

  return (
    <div className={cn("rounded-2xl border px-4 py-3 min-w-0", tones[tone])}>
      <div className="flex items-center gap-2 mb-1 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <p className="text-xs uppercase tracking-[0.16em] font-medium truncate">{label}</p>
      </div>
      <p className="text-sm  py-1  text-white break-words">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, subtitle, trend, icon: Icon, accent = 'indigo', delay = 0 }) {
  const accents = {
    indigo: {
      icon: "text-lime-300",
      pill: "bg-lime-400/10 text-lime-300 border-lime-400/20",
      glow: "from-lime-400/20 to-transparent",
    },
    emerald: {
      icon: "text-emerald-400",
      pill: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      glow: "from-emerald-500/20 to-transparent",
    },
    amber: {
      icon: "text-amber-400",
      pill: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      glow: "from-amber-500/20 to-transparent",
    },
    rose: {
      icon: "text-rose-400",
      pill: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      glow: "from-rose-500/20 to-transparent",
    },
  };

  const style = accents[accent] || accents.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="relative overflow-hidden rounded-[1.75rem] border border-lime-400/15 bg-[#020806]/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", style.glow)} />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between gap-4 min-w-0">
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm font-medium text-lime-100/55">{title}</p>
              <div className="flex flex-wrap items-end gap-2 min-w-0">
                <h3 className="text-3xl font-semibold text-white leading-none break-words">{value}</h3>
                {trend ? (
                  <span className={cn("text-xs border rounded-full px-2 py-1", style.pill)}>
                    {trend}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-lime-100/45 break-words">{subtitle}</p>
            </div>

            <div className="w-11 h-11 rounded-2xl border border-lime-400/15 bg-[#061006]/80/70 flex items-center justify-center shrink-0">
              <Icon className={cn("w-5 h-5", style.icon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ onNewRequest }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-lime-400/20 bg-[#061006]/80/20 px-6 py-14 text-center overflow-hidden">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-[#061006]/80 flex items-center justify-center mb-4">
        <CalendarDays className="w-5 h-5 text-lime-100/55" />
      </div>
      <h4 className="text-white font-medium mb-2">No leave requests found</h4>
      <p className="text-sm text-lime-100/55 max-w-md mx-auto mb-6 break-words">
        Try changing filters or create a new leave request to get started.
      </p>
      <Button
        onClick={onNewRequest}
        className="bg-lime-400 text-white hover:bg-lime-400 rounded-2xl px-5"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        Create New Request
      </Button>
    </div>
  );
}

export default function LeaveRequests() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all'); // all | month | 3m
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (!feedback.message) return;

    const timer = setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 3500);

    return () => clearTimeout(timer);
  }, [feedback]);

  const { data: leaveRequests = [], isLoading, isError } = useQuery({
    queryKey: ['myLeaveRequests', user?.email],
    queryFn: () =>
      base44.entities.LeaveRequest.filter(
        { employee_email: user.email },
        '-created_date'
      ),
    enabled: !!user?.email,
  });

  const createLeaveMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.LeaveRequest.create({
        ...data,
        employee_id: user.id,
        employee_email: user.email,
        employee_name: user.full_name,
        status: 'pending',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] });
      setShowForm(false);
      setFeedback({
        type: 'success',
        message: 'Leave request submitted successfully.',
      });
    },
    onError: () => {
      setFeedback({
        type: 'error',
        message: 'Request failed. Please try again.',
      });
    },
  });

  const pendingCount = leaveRequests.filter((l) => l.status === 'pending').length;
  const approvedCount = leaveRequests.filter((l) => l.status === 'approved').length;
  const rejectedCount = leaveRequests.filter((l) => l.status === 'rejected').length;

  const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
  const currentMonthStart = startOfMonth(new Date());

  const currentMonthApproved = leaveRequests.filter((l) => {
    if (l.status !== 'approved' || !l.created_date) return false;
    const date = new Date(l.created_date);
    return date >= currentMonthStart;
  }).length;

  const previousMonthApproved = leaveRequests.filter((l) => {
    if (l.status !== 'approved' || !l.created_date) return false;
    const date = new Date(l.created_date);
    return date >= previousMonthStart && date < currentMonthStart;
  }).length;

  const approvedDiff = currentMonthApproved - previousMonthApproved;
  const approvedTrend =
    approvedDiff > 0 ? `↑ +${approvedDiff}` :
    approvedDiff < 0 ? `↓ ${approvedDiff}` :
    '→ 0';

  const urgentPending = leaveRequests.filter((l) => {
    if (l.status !== 'pending' || !l.created_date) return false;
    const created = new Date(l.created_date);
    const ageMs = Date.now() - created.getTime();
    return ageMs > 1000 * 60 * 60 * 24 * 5;
  }).length;

  const recentRequest = leaveRequests[0] || null;

  const nextUpcomingApproved = useMemo(() => {
    const now = new Date();

    return leaveRequests
      .filter((l) => l.status === 'approved' && l.start_date)
      .map((l) => ({ ...l, _start: parseISO(l.start_date) }))
      .filter((l) => isAfter(l._start, now))
      .sort((a, b) => a._start - b._start)[0] || null;
  }, [leaveRequests]);

  const filteredRequests = useMemo(() => {
    let data = [...leaveRequests];

    if (activeTab !== 'all') {
      data = data.filter((l) => l.status === activeTab);
    }

    if (rangeFilter === 'month') {
      data = data.filter((l) => {
        const date = l.created_date ? new Date(l.created_date) : null;
        return date && date >= currentMonthStart;
      });
    }

    if (rangeFilter === '3m') {
      const threeMonthsAgo = subMonths(new Date(), 3);
      data = data.filter((l) => {
        const date = l.created_date ? new Date(l.created_date) : null;
        return date && date >= threeMonthsAgo;
      });
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter((l) =>
        [
          l.reason,
          l.leave_type,
          l.status,
          l.employee_name,
          l.start_date,
          l.end_date,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    data.sort((a, b) => {
      const aDate = new Date(a.created_date || 0).getTime();
      const bDate = new Date(b.created_date || 0).getTime();
      return sortBy === 'newest' ? bDate - aDate : aDate - bDate;
    });

    return data;
  }, [leaveRequests, activeTab, rangeFilter, sortBy, search, currentMonthStart]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-6xl space-y-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-8 w-64 rounded bg-[#020806]/90" />
            <div className="h-4 w-80 rounded bg-[#020806]/90" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <div className="rounded-[2rem] border border-lime-400/15 bg-[#020806]/90 p-6 animate-pulse">
            <div className="h-24 rounded-2xl bg-[#061006]/80" />
          </div>

          <div className="rounded-[2rem] border border-lime-400/15 bg-[#020806]/90 p-6 animate-pulse">
            <div className="h-80 rounded-2xl bg-[#061006]/80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-10 overflow-x-hidden">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6 overflow-x-hidden">

        <Banner type={feedback.type} message={feedback.message} />

        {isError && (
          <Banner
            type="error"
            message="Unable to load leave requests right now. Please refresh and try again."
          />
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 min-w-0"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-300">
                <Sparkles className="w-3.5 h-3.5" />
                Employee Leave Hub
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight break-words">
              Leave <span className="text-lime-300">Management</span>
            </h1>
            <p className="text-lime-100/55 text-sm md:text-base mt-2 break-words">
              Manage requests, track approval status, and review upcoming leave plans.
            </p>
          </div>

          <div className="flex-shrink-0 w-full xl:w-auto">
            <Button
              onClick={() => setShowForm(true)}
              className="w-full xl:w-auto bg-lime-400 text-black hover:bg-lime-400 font-medium px-6 h-12 rounded-2xl shadow-[0_0_28px_rgba(132,255,0,0.16)] shadow-lime-400/20 border border-lime-400/15"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </motion.div>

        {/* Insight Strip */}
        <Card className="rounded-[2rem] border border-lime-400/15 bg-[#020806]/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <InsightTile
                icon={Clock}
                label="Pending Approvals"
                value={
                  pendingCount > 0
                    ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} waiting`
                    : 'No pending requests'
                }
                tone="amber"
              />

              <InsightTile
                icon={AlertCircle}
                label="Urgent Pending"
                value={
                  urgentPending > 0
                    ? `${urgentPending} older than 5 days`
                    : 'No urgent delays'
                }
                tone={urgentPending > 0 ? 'rose' : 'emerald'}
              />

              <InsightTile
                icon={ArrowUpRight}
                label="Last Submitted"
                value={
                  recentRequest?.created_date
                    ? formatDistanceToNow(new Date(recentRequest.created_date), { addSuffix: true })
                    : 'No recent request'
                }
                tone="indigo"
              />

              <InsightTile
                icon={CalendarDays}
                label="Next Approved Leave"
                value={
                  nextUpcomingApproved?.start_date
                    ? format(parseISO(nextUpcomingApproved.start_date), 'dd MMM yyyy')
                    : 'No upcoming approved leave'
                }
                tone="slate"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Pending"
              value={pendingCount}
              subtitle={
                urgentPending > 0
                  ? `${urgentPending} request(s) need attention`
                  : 'Awaiting manager response'
              }
              trend={pendingCount > 0 ? `${pendingCount} open` : 'No backlog'}
              icon={Clock}
              accent="amber"
              delay={0.05}
            />

            <MetricCard
              title="Approved"
              value={approvedCount}
              subtitle="Successfully approved requests"
              trend={approvedTrend}
              icon={CheckCircle2}
              accent="emerald"
              delay={0.1}
            />

            <MetricCard
              title="Rejected"
              value={rejectedCount}
              subtitle={
                rejectedCount > 0
                  ? 'Review comments before reapplying'
                  : 'No rejected requests'
              }
              trend={rejectedCount > 0 ? 'Needs review' : 'Clean'}
              icon={XCircle}
              accent="rose"
              delay={0.15}
            />
          </div>
        )}

        {/* Controls */}
        <Card className="rounded-[2rem] border border-lime-400/15 bg-[#020806]/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden">
          <CardContent className="p-5 md:p-6 space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Filter & Manage</h3>
                <p className="text-sm text-lime-100/55 mt-1 break-words">
                  Narrow results by status, time range, sort order, or keywords.
                </p>
              </div>

              <div className="flex items-center gap-2 text-lime-100/55 text-sm min-w-0">
                <Filter className="w-4 h-4 shrink-0" />
                <span className="break-words">{filteredRequests.length} matching request(s)</span>
              </div>
            </div>

            {/* Status tabs */}
            <div className="overflow-x-auto hide-scrollbar">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-max min-w-full">
                <TabsList className="bg-[#000000] border border-lime-400/20 p-1 rounded-2xl h-auto min-h-14 flex flex-nowrap justify-start w-max">
                  <TabsTrigger
                    value="all"
                    className="rounded-xl px-5 py-2.5 font-medium whitespace-nowrap data-[state=active]:bg-lime-400 data-[state=active]:text-black"
                  >
                    All
                  </TabsTrigger>

                  <TabsTrigger
                    value="pending"
                    className="rounded-xl px-5 py-2.5 font-medium whitespace-nowrap data-[state=active]:bg-lime-400 data-[state=active]:text-black"
                  >
                    Pending
                    {pendingCount > 0 && (
                      <span className="ml-2 bg-amber-500 text-black text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                        {pendingCount}
                      </span>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="approved"
                    className="rounded-xl px-5 py-2.5 font-medium whitespace-nowrap data-[state=active]:bg-lime-400 data-[state=active]:text-black"
                  >
                    Approved
                  </TabsTrigger>

                  <TabsTrigger
                    value="rejected"
                    className="rounded-xl px-5 py-2.5 font-medium whitespace-nowrap data-[state=active]:bg-lime-400 data-[state=active]:text-black"
                  >
                    Rejected
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Secondary controls */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-4 items-start min-w-0">
              <div className="relative min-w-0">
                <Search className="w-4 h-4 text-lime-100/45 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by reason, leave type, date, or status"
                  className="w-full h-12 rounded-2xl border border-lime-400/15 bg-[#000000] pl-11 pr-4 text-sm text-white placeholder:text-lime-100/45 outline-none focus:border-lime-400/40"
                />
              </div>

              <div className="flex flex-wrap gap-2 min-w-0">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'month', label: 'This Month' },
                  { value: '3m', label: 'Last 3 Months' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setRangeFilter(item.value)}
                    className={cn(
                      "px-4 h-12 rounded-2xl border text-sm font-medium transition whitespace-nowrap",
                      rangeFilter === item.value
                        ? "bg-lime-400 text-black border-lime-400"
                        : "bg-[#000000] text-lime-100/75 border-lime-400/15 hover:bg-[#061006]/80"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none w-full xl:w-[180px] h-12 rounded-2xl border border-lime-400/15 bg-[#000000] px-4 pr-10 text-sm text-white outline-none focus:border-lime-400/40"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <ChevronDown className="w-4 h-4 text-lime-100/45 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List section */}
        <Card className="rounded-[2rem] border border-lime-400/15 bg-[#020806]/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden">
          <CardContent className="p-5 md:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white break-words">Your Applications</h3>
                  <p className="text-sm text-lime-100/55 break-words">
                    Review submitted requests and current approval status.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-lime-400/15 bg-[#061006]/80/60 px-3 py-2 text-sm text-lime-100/75 w-fit">
                <TrendingUp className="w-4 h-4 text-lime-300" />
                <span>{filteredRequests.length} record(s)</span>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl border border-lime-400/15 bg-[#061006]/80/40 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState onNewRequest={() => setShowForm(true)} />
            ) : (
              <div className="min-w-0 overflow-hidden">
                <LeaveRequestList requests={filteredRequests} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form dialog */}
        <LeaveRequestForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createLeaveMutation.mutate(data)}
          isLoading={createLeaveMutation.isPending}
        />
      </div>
    </div>
  );
}