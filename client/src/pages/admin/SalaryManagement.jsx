import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, subMonths } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DollarSign,
  Search,
  Send,
  FileText,
  Loader2,
  Trash2,
  Download,
  CheckCircle2,
} from "lucide-react";

const THEME = {
  bg: "#000000",
  surface: "#040700",
  surface2: "#070b00",
  border: "#1B211A",
  accent: "#a3d312",
  accentSoft: "#b7ea20",
  accentTextDark: "#0a0d00",
  muted: "#8a9472",
  text: "#f4f7ea",
  danger: "#ff6b6b",
};

const STATUS_META = {
  none: { label: "Not created", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  draft: { label: "Draft", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  sent: { label: "Sent", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  paid: { label: "Paid", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.none;
  return (
    <Badge style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}>
      {meta.label}
    </Badge>
  );
}

function generateMonthOptions() {
  const options = [];
  for (let i = 0; i < 13; i++) {
    const d = subMonths(new Date(), i);
    options.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
  }
  return options;
}

export default function SalaryManagement() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.appSettings.get(),
    staleTime: 5 * 60 * 1000,
  });
  const symbol = appSettings?.currency_symbol || "₹";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["salaryEmployees", month],
    queryFn: () => base44.salary.employees(month),
  });

  const rows = data?.employees || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.user.full_name?.toLowerCase().includes(q) ||
        r.user.email?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const upsert = useMutation({
    mutationFn: (payload) => base44.salary.payslips.upsert(payload),
    onSuccess: () => {
      toast.success("Payslip saved");
      queryClient.invalidateQueries({ queryKey: ["salaryEmployees", month] });
      setEditing(null);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error || err?.message || "Failed to save"),
  });

  const send = useMutation({
    mutationFn: (id) => base44.salary.payslips.send(id),
    onSuccess: () => {
      toast.success("Payslip sent to employee");
      queryClient.invalidateQueries({ queryKey: ["salaryEmployees", month] });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error || err?.message || "Failed to send"),
  });

  const remove = useMutation({
    mutationFn: (id) => base44.salary.payslips.delete(id),
    onSuccess: () => {
      toast.success("Payslip deleted");
      queryClient.invalidateQueries({ queryKey: ["salaryEmployees", month] });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete"),
  });

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <DollarSign className="w-7 h-7" style={{ color: THEME.accent }} />
            <h1 className="text-2xl md:text-3xl font-bold">Salary Management</h1>
          </div>
          <p style={{ color: THEME.muted }} className="text-sm">
            Set monthly salary, generate payslip PDF, and send it to the employee
          </p>
        </motion.div>

        {/* Filter bar */}
        <Card
          className="rounded-2xl border p-4 mb-6"
          style={{ background: THEME.surface, borderColor: THEME.border }}
        >
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: THEME.surface2, border: `1px solid ${THEME.border}` }}>
              <Search className="w-4 h-4" style={{ color: THEME.muted }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees by name or email"
                className="bg-transparent outline-none w-full text-sm"
                style={{ color: THEME.text }}
              />
            </div>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full md:w-[220px]"
                style={{ background: THEME.surface2, borderColor: THEME.border, color: THEME.text }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Employees grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: THEME.accent }} />
          </div>
        ) : isError ? (
          <Card className="rounded-2xl p-6 border" style={{ background: THEME.surface, borderColor: THEME.border, color: THEME.danger }}>
            Failed to load employees.
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl p-10 border text-center"
            style={{ background: THEME.surface, borderColor: THEME.border }}>
            <p style={{ color: THEME.muted }}>No employees match this filter.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((row) => (
              <motion.div
                key={row.user._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
              >
                <Card
                  className="rounded-2xl p-5 border cursor-pointer hover:border-lime-400/40 transition"
                  style={{ background: THEME.surface, borderColor: THEME.border }}
                  onClick={() =>
                    setEditing({
                      user: row.user,
                      payslip: row.payslip,
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: THEME.text }}>
                        {row.user.full_name}
                      </p>
                      <p className="text-xs truncate" style={{ color: THEME.muted }}>
                        {row.user.email}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="rounded-xl p-3 mb-3"
                    style={{ background: THEME.surface2, border: `1px solid ${THEME.border}` }}>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>
                      Net Salary
                    </p>
                    <p className="text-2xl font-bold" style={{ color: THEME.accentSoft }}>
                      {symbol}
                      {Number(row.net_salary || 0).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {row.payslip ? (
                      <>
                        {row.payslip.payslip_pdf_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(row.payslip.payslip_pdf_url, "_blank");
                            }}
                            className="gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </Button>
                        )}
                        {row.payslip.status !== "paid" && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              send.mutate(row.payslip._id);
                            }}
                            disabled={send.isPending}
                            className="gap-1"
                            style={{ background: THEME.accent, color: THEME.accentTextDark }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {row.payslip.status === "sent" ? "Resend" : "Send"}
                          </Button>
                        )}
                        {row.payslip.status === "draft" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this draft payslip?")) {
                                remove.mutate(row.payslip._id);
                              }
                            }}
                            className="gap-1"
                            style={{ color: THEME.danger }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: THEME.muted }}>
                        Click to create payslip
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <PayslipDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        editing={editing}
        month={month}
        symbol={symbol}
        onSave={(payload) => upsert.mutate(payload)}
        onSend={(id) => send.mutate(id)}
        saving={upsert.isPending}
        sending={send.isPending}
      />
    </div>
  );
}

function PayslipDialog({ open, onOpenChange, editing, month, symbol, onSave, onSend, saving, sending }) {
  const payslip = editing?.payslip;
  const user = editing?.user;

  const [form, setForm] = useState({
    base_salary: 0,
    bonus: 0,
    deductions: 0,
    notes: "",
    month,
  });

  React.useEffect(() => {
    if (!editing) return;
    setForm({
      base_salary: payslip?.base_salary ?? 0,
      bonus: payslip?.bonus ?? 0,
      deductions: payslip?.deductions ?? 0,
      notes: payslip?.notes ?? "",
      month: payslip?.month || month,
    });
  }, [editing, payslip, month]);

  const net =
    Number(form.base_salary || 0) +
    Number(form.bonus || 0) -
    Number(form.deductions || 0);

  const handleSave = () => {
    if (!user) return;
    if (!form.month || !/^\d{4}-\d{2}$/.test(form.month)) {
      toast.error("Invalid month");
      return;
    }
    if (Number(form.base_salary) <= 0) {
      toast.error("Base salary must be greater than 0");
      return;
    }
    onSave({
      user_id: user._id,
      month: form.month,
      base_salary: Number(form.base_salary) || 0,
      bonus: Number(form.bonus) || 0,
      deductions: Number(form.deductions) || 0,
      notes: form.notes || "",
    });
  };

  const isPaid = payslip?.status === "paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg rounded-2xl"
        style={{ background: THEME.surface, borderColor: THEME.border, color: THEME.text }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: THEME.text }}>
            {payslip ? "Edit payslip" : "Create payslip"}
          </DialogTitle>
          <DialogDescription style={{ color: THEME.muted }}>
            {user?.full_name} · {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: THEME.muted }}>Month</label>
            <Select
              value={form.month}
              onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}
              disabled={!!payslip}
            >
              <SelectTrigger style={{ background: THEME.surface2, borderColor: THEME.border, color: THEME.text }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field
            label={`Base Salary (${symbol})`}
            value={form.base_salary}
            onChange={(v) => setForm((f) => ({ ...f, base_salary: v }))}
            disabled={isPaid}
          />
          <Field
            label={`Bonus (${symbol})`}
            value={form.bonus}
            onChange={(v) => setForm((f) => ({ ...f, bonus: v }))}
            disabled={isPaid}
          />
          <Field
            label={`Deductions (${symbol})`}
            value={form.deductions}
            onChange={(v) => setForm((f) => ({ ...f, deductions: v }))}
            disabled={isPaid}
          />

          <div>
            <label className="text-xs mb-1 block" style={{ color: THEME.muted }}>Notes (optional)</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Any notes for the employee..."
              disabled={isPaid}
              style={{ background: THEME.surface2, borderColor: THEME.border, color: THEME.text }}
            />
          </div>

          <div className="rounded-xl p-4"
            style={{ background: `${THEME.accent}10`, border: `1px solid ${THEME.accent}33` }}>
            <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>Net Salary</p>
            <p className="text-2xl font-bold" style={{ color: THEME.accentSoft }}>
              {symbol}{Number(net).toLocaleString("en-IN")}
            </p>
          </div>

          {payslip && (
            <div className="flex items-center gap-2 text-sm" style={{ color: THEME.muted }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: STATUS_META[payslip.status]?.color }} />
              Status: <StatusBadge status={payslip.status} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!isPaid && (
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ background: THEME.surface2, color: THEME.text, border: `1px solid ${THEME.border}` }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              {payslip ? "Save changes" : "Generate payslip"}
            </Button>
          )}
          {payslip && payslip.status !== "paid" && (
            <Button
              onClick={() => onSend(payslip._id)}
              disabled={sending}
              style={{ background: THEME.accent, color: THEME.accentTextDark }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {payslip.status === "sent" ? "Resend" : "Send to employee"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-xs mb-1 block" style={{ color: THEME.muted }}>{label}</label>
      <Input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ background: THEME.surface2, borderColor: THEME.border, color: THEME.text }}
      />
    </div>
  );
}
