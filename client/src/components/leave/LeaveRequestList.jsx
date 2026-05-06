import React, { useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays, isAfter, isToday } from "date-fns";
import { motion } from "framer-motion";
import {
  FileText,
  Check,
  X,
  Clock,
  MessageSquare,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const THEME = {
  bg: "#000000",
  surface: "#000000",
  surface2: "#000000",
  surface3: "#000000",
  border: "#1B211A",
  borderSoft: "#1c2505",
  accent: "#a3d312",
  accentSoft: "#b7ea20",
  accentTextDark: "#0a0d00",
  muted: "#8a9472",
  muted2: "#66704f",
  text: "#f4f7ea",
  warning: "#d6ff4a",
  danger: "#ff7b7b",
};

const statusStyles = {
  pending: "bg-[rgba(163,211,18,0.08)] text-[#d6ff4a] border-[rgba(163,211,18,0.22)]",
  approved: "bg-[rgba(163,211,18,0.12)] text-[#f4f7ea] border-[rgba(163,211,18,0.28)]",
  rejected: "bg-[rgba(255,123,123,0.08)] text-[#ff9c9c] border-[rgba(255,123,123,0.2)]",
};

const leaveTypeLabels = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  emergency: "Emergency",
  other: "Other",
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getMonthGroupLabel(dateValue) {
  try {
    return format(parseISO(dateValue), "MMMM yyyy");
  } catch {
    return "Other";
  }
}

function getRequestMeta(request) {
  try {
    const start = parseISO(request.start_date);
    const now = new Date();

    if (request.status === "pending") {
      return { label: "Awaiting approval", tone: "accent" };
    }

    if (request.status === "approved" && isToday(start)) {
      return { label: "Starts today", tone: "success" };
    }

    if (request.status === "approved" && isAfter(start, now)) {
      return { label: `Starts ${format(start, "dd MMM")}`, tone: "success" };
    }

    if (request.status === "rejected") {
      return { label: "Needs review", tone: "danger" };
    }

    return { label: "Recorded", tone: "slate" };
  } catch {
    return { label: "Recorded", tone: "slate" };
  }
}

function MetaPill({ label, tone }) {
  const tones = {
    accent: "bg-[rgba(163,211,18,0.08)] text-[#d6ff4a] border-[rgba(163,211,18,0.22)]",
    success: "bg-[rgba(163,211,18,0.12)] text-[#f4f7ea] border-[rgba(163,211,18,0.28)]",
    danger: "bg-[rgba(255,123,123,0.08)] text-[#ff9c9c] border-[rgba(255,123,123,0.2)]",
    slate: "bg-[#070b00] text-[#8a9472] border-[#2a3608]",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]", tones[tone])}>
      {label}
    </span>
  );
}

export default function LeaveRequestList({
  requests = [],
  isAdmin = false,
  onApprove,
  onReject,
}) {
  const groupedRequests = useMemo(() => {
    const groups = {};

    requests.forEach((request) => {
      const label = getMonthGroupLabel(request.created_date || request.start_date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(request);
    });

    return Object.entries(groups);
  }, [requests]);

  if (requests.length === 0) {
    return (
      <div
        className="rounded-[28px] border border-dashed px-6 py-12 text-center overflow-hidden"
        style={{
          borderColor: THEME.border,
          background: THEME.surface,
        }}
      >
        <div
          className="mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: THEME.surface2,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <FileText className="w-5 h-5" style={{ color: THEME.muted }} />
        </div>
        <h4 className="font-medium mb-2 tracking-[-0.01em]" style={{ color: THEME.text }}>
          No leave requests found
        </h4>
        <p
          className="text-sm max-w-md mx-auto break-words leading-6"
          style={{ color: THEME.muted }}
        >
          There are no requests in the current filter. Try changing filters or create a new request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {groupedRequests.map(([groupLabel, items], groupIndex) => (
        <div key={groupLabel} className="space-y-3 min-w-0">
          <div className="flex items-center gap-3 px-1 min-w-0">
            <div className="h-px flex-1" style={{ background: THEME.border }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.22em] whitespace-nowrap"
              style={{ color: THEME.muted2 }}
            >
              {groupLabel}
            </span>
            <div className="h-px flex-1" style={{ background: THEME.border }} />
          </div>

          <div className="space-y-3 min-w-0">
            {items.map((request, index) => {
              const days =
                differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;

              const meta = getRequestMeta(request);

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: groupIndex * 0.04 + index * 0.04 }}
                  className="rounded-[24px] border transition-colors overflow-hidden min-w-0 shadow-none"
                  style={{
                    background: THEME.surface,
                    borderColor:
                      request.status === "pending"
                        ? "rgba(163,211,18,0.22)"
                        : request.status === "approved"
                        ? "rgba(163,211,18,0.28)"
                        : request.status === "rejected"
                        ? "rgba(255,123,123,0.2)"
                        : THEME.border,
                  }}
                >
                  <div className="p-5 md:p-6 space-y-5 min-w-0">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 min-w-0">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div
                          className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                          style={{
                            background: THEME.surface2,
                            border: `1px solid ${THEME.border}`,
                          }}
                        >
                          <span
                            className="text-[10px] uppercase tracking-[0.18em] font-semibold leading-none mb-1"
                            style={{ color: THEME.accentSoft }}
                          >
                            {format(parseISO(request.start_date), "MMM")}
                          </span>
                          <span
                            className="text-lg font-semibold leading-none"
                            style={{ color: THEME.text }}
                          >
                            {format(parseISO(request.start_date), "d")}
                          </span>
                        </div>

                        <div className="space-y-3 min-w-0 flex-1">
                          {isAdmin && (
                            <p
                              className="text-base font-semibold break-words tracking-[-0.01em]"
                              style={{ color: THEME.text }}
                            >
                              {request.employee_name}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <Badge
                              variant="outline"
                              className="h-6 px-2.5 rounded-full text-[11px] font-medium uppercase tracking-[0.05em]"
                              style={{
                                borderColor: THEME.border,
                                background: THEME.surface2,
                                color: THEME.text,
                              }}
                            >
                              {leaveTypeLabels[request.leave_type] || request.leave_type || "Leave"}
                            </Badge>

                            <Badge
                              className={cn(
                                "h-6 px-2.5 rounded-full border text-[11px] font-medium capitalize",
                                statusStyles[request.status] || ""
                              )}
                              style={
                                !statusStyles[request.status]
                                  ? {
                                      background: THEME.surface2,
                                      color: THEME.muted,
                                      borderColor: THEME.border,
                                    }
                                  : undefined
                              }
                            >
                              {request.status}
                            </Badge>

                            <MetaPill label={meta.label} tone={meta.tone} />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm min-w-0" style={{ color: THEME.muted }}>
                            <span className="break-words">
                              {format(parseISO(request.start_date), "dd MMM yyyy")}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: THEME.muted2 }} />
                            <span className="break-words">
                              {format(parseISO(request.end_date), "dd MMM yyyy")}
                            </span>
                            <span style={{ color: THEME.accentSoft }} className="font-medium">
                              ({days} day{days > 1 ? 's' : ''})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full xl:w-auto xl:min-w-[220px] min-w-0">
                        {isAdmin && request.status === "pending" ? (
                          <div className="flex flex-col sm:flex-row xl:flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => onApprove?.(request)}
                              className="rounded-xl h-10 border border-lime-400/15"
                              style={{
                                background: THEME.accent,
                                color: THEME.accentTextDark,
                              }}
                            >
                              <Check className="w-4 h-4 mr-1.5" />
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReject?.(request)}
                              className="rounded-xl h-10"
                              style={{
                                color: "#ff9c9c",
                                borderColor: "rgba(255,123,123,0.2)",
                                background: "rgba(255,123,123,0.08)",
                              }}
                            >
                              <X className="w-4 h-4 mr-1.5" />
                              Reject
                            </Button>
                          </div>
                        ) : !isAdmin && request.status === "pending" ? (
                          <div
                            className="rounded-2xl px-4 py-3"
                            style={{
                              border: `1px solid rgba(163,211,18,0.22)`,
                              background: "rgba(163,211,18,0.08)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 shrink-0" style={{ color: THEME.accentSoft }} />
                              <span className="text-sm font-medium break-words" style={{ color: THEME.accentSoft }}>
                                Awaiting approval
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="rounded-2xl px-4 py-3"
                            style={{
                              border: `1px solid ${THEME.border}`,
                              background: THEME.surface2,
                            }}
                          >
                            <p
                              className="text-xs uppercase tracking-[0.18em] mb-1"
                              style={{ color: THEME.muted2 }}
                            >
                              Submitted
                            </p>
                            <p className="text-sm font-medium break-words" style={{ color: THEME.text }}>
                              {request.created_date
                                ? format(parseISO(request.created_date), "dd MMM yyyy")
                                : "—"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-w-0">
                      <div
                        className="rounded-2xl px-4 py-4 min-w-0"
                        style={{
                          border: `1px solid ${THEME.border}`,
                          background: THEME.surface2,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: "rgba(163,211,18,0.08)",
                              border: `1px solid rgba(163,211,18,0.18)`,
                            }}
                          >
                            <FileText className="w-4 h-4" style={{ color: THEME.accent }} />
                          </div>
                          <span
                            className="text-xs font-medium tracking-[0.05em] uppercase"
                            style={{ color: THEME.muted }}
                          >
                            Reason
                          </span>
                        </div>
                        <p className="text-sm leading-6 break-words" style={{ color: THEME.text }}>
                          {request.reason || "No reason provided"}
                        </p>
                      </div>

                      <div
                        className="rounded-2xl px-4 py-4 min-w-0"
                        style={{
                          border: `1px solid ${THEME.border}`,
                          background: THEME.surface2,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: "rgba(163,211,18,0.06)",
                              border: `1px solid ${THEME.border}`,
                            }}
                          >
                            <MessageSquare className="w-4 h-4" style={{ color: THEME.accentSoft }} />
                          </div>
                          <span
                            className="text-xs font-medium tracking-[0.05em] uppercase"
                            style={{ color: THEME.muted }}
                          >
                            {isAdmin ? "Remarks" : "Manager Remarks"}
                          </span>
                        </div>

                        {request.admin_remarks ? (
                          <p className="text-sm leading-6 break-words" style={{ color: THEME.text }}>
                            {request.admin_remarks}
                          </p>
                        ) : (
                          <p className="text-sm break-words" style={{ color: THEME.muted }}>
                            No remarks added yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl px-4 py-4 overflow-hidden"
                      style={{
                        border: `1px solid ${THEME.border}`,
                        background: THEME.surface3,
                      }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: THEME.accent }} />
                          <span className="text-sm" style={{ color: THEME.text }}>Submitted</span>
                        </div>

                        <div className="hidden md:block h-px flex-1" style={{ background: THEME.border }} />

                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              background:
                                request.status === "pending"
                                  ? THEME.accentSoft
                                  : request.status === "approved" || request.status === "rejected"
                                  ? THEME.accent
                                  : THEME.muted2,
                            }}
                          />
                          <span className="text-sm" style={{ color: THEME.text }}>Under Review</span>
                        </div>

                        <div className="hidden md:block h-px flex-1" style={{ background: THEME.border }} />

                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              background:
                                request.status === "approved"
                                  ? THEME.accent
                                  : request.status === "rejected"
                                  ? THEME.danger
                                  : THEME.muted2,
                            }}
                          />
                          <span className="text-sm" style={{ color: THEME.text }}>
                            {request.status === "approved"
                              ? "Approved"
                              : request.status === "rejected"
                              ? "Rejected"
                              : "Final Decision Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {request.status === "rejected" && request.admin_remarks && (
                      <div
                        className="rounded-2xl px-4 py-3"
                        style={{
                          border: `1px solid rgba(255,123,123,0.2)`,
                          background: "rgba(255,123,123,0.08)",
                        }}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: THEME.danger }} />
                          <p className="text-sm leading-6 break-words" style={{ color: "#ffb3b3" }}>
                            This request was rejected. Review the manager remarks before submitting again.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}