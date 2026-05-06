import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Wallet,
} from "lucide-react";

const THEME = {
  bg: "#000000",
  surface: "#040700",
  surface2: "#070b00",
  border: "#1B211A",
  accent: "#a3d312",
  accentSoft: "#b7ea20",
  muted: "#8a9472",
  text: "#f4f7ea",
  danger: "#ff6b6b",
};

const STATUS_META = {
  draft: { label: "Draft", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  sent: { label: "Sent", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  paid: { label: "Paid", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <Badge style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}>
      {meta.label}
    </Badge>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card
      className="p-5 rounded-2xl border"
      style={{ background: THEME.surface, borderColor: THEME.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: THEME.muted }}>
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-semibold tracking-[-0.03em] truncate" style={{ color: THEME.text }}>
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(163,211,18,0.08)", border: `1px solid ${THEME.border}` }}
        >
          <Icon className="w-4 h-4" style={{ color: THEME.accent }} />
        </div>
      </div>
    </Card>
  );
}

export default function MySalary() {
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["myPayslips"],
    queryFn: () => base44.salary.payslips.listMine(),
    staleTime: 60 * 1000,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.appSettings.get(),
    staleTime: 5 * 60 * 1000,
  });

  const symbol = appSettings?.currency_symbol || "₹";
  const currentYear = new Date().getFullYear();

  const sorted = [...payslips].sort((a, b) => b.month.localeCompare(a.month));
  const yearPayslips = sorted.filter((p) => p.month.startsWith(String(currentYear)));
  const totalThisYear = yearPayslips.reduce((s, p) => s + (p.net_salary || 0), 0);
  const avgMonthly = yearPayslips.length > 0 ? totalThisYear / yearPayslips.length : 0;
  const lastSent = sorted.find((p) => p.status === "sent" || p.status === "paid");

  const handleDownload = (payslip) => {
    if (payslip.payslip_pdf_url) {
      window.open(payslip.payslip_pdf_url, "_blank");
    } else {
      toast.error("PDF not available yet");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <DollarSign className="w-7 h-7" style={{ color: THEME.accent }} />
            <h1 className="text-2xl md:text-3xl font-bold">My Salary</h1>
          </div>
          <p style={{ color: THEME.muted }} className="text-sm">
            Your payslips and payment history
          </p>
        </motion.div>

        {/* Year summary */}
        <Card
          className="p-6 md:p-8 rounded-2xl border mb-6"
          style={{
            background: `linear-gradient(135deg, ${THEME.accent}15 0%, ${THEME.accent}05 100%)`,
            border: `2px solid ${THEME.accent}40`,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p style={{ color: THEME.muted }} className="text-xs uppercase tracking-wider mb-2">
                Total earned in {currentYear}
              </p>
              <p className="text-3xl md:text-4xl font-bold" style={{ color: THEME.accentSoft }}>
                {symbol}{totalThisYear.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p style={{ color: THEME.muted }} className="text-xs uppercase tracking-wider mb-2">
                Average monthly
              </p>
              <p className="text-2xl font-semibold" style={{ color: THEME.text }}>
                {symbol}{avgMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p style={{ color: THEME.muted }} className="text-xs uppercase tracking-wider mb-2">
                Payslips received
              </p>
              <p className="text-2xl font-semibold" style={{ color: THEME.text }}>
                {yearPayslips.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Mini stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Last payslip" value={lastSent ? format(new Date(`${lastSent.month}-01`), "MMM yyyy") : "—"} icon={Calendar} />
          <StatCard label="Last net amount" value={lastSent ? `${symbol}${(lastSent.net_salary || 0).toLocaleString("en-IN")}` : "—"} icon={Wallet} />
          <StatCard label="Total payslips" value={sorted.length} icon={TrendingUp} />
        </div>

        {/* Payslips list */}
        <Card className="rounded-2xl border" style={{ background: THEME.surface, borderColor: THEME.border }}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: THEME.text }}>
              Salary History
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: THEME.accent }} />
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-xl p-8 text-center"
                style={{ background: THEME.surface2, border: `1px solid ${THEME.border}` }}>
                <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: THEME.muted }} />
                <p style={{ color: THEME.muted }}>No payslips yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((p) => (
                  <motion.div
                    key={p._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    style={{ background: THEME.surface2, border: `1px solid ${THEME.border}` }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${THEME.accent}10`, border: `1px solid ${THEME.border}` }}
                      >
                        <Calendar className="w-5 h-5" style={{ color: THEME.accent }} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: THEME.text }}>
                          {format(new Date(`${p.month}-01`), "MMMM yyyy")}
                        </p>
                        <p className="text-xs" style={{ color: THEME.muted }}>
                          {p.sent_date
                            ? `Sent ${format(new Date(p.sent_date), "dd MMM yyyy")}`
                            : "Not sent"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider" style={{ color: THEME.muted }}>
                          Net
                        </p>
                        <p className="text-xl font-bold" style={{ color: THEME.accentSoft }}>
                          {symbol}{Number(p.net_salary || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(p)}
                        disabled={!p.payslip_pdf_url}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
