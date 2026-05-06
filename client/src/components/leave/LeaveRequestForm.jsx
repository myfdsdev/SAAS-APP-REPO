import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays,
  Send,
  AlertCircle,
  FileText,
  Clock3,
  BriefcaseMedical,
  Coffee,
  Plane,
} from "lucide-react";
import { differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";

const leaveTypes = [
  { value: "sick", label: "Sick Leave", icon: BriefcaseMedical },
  { value: "casual", label: "Casual Leave", icon: Coffee },
  { value: "annual", label: "Paid Leave", icon: Plane },
];

const initialForm = {
  leave_type: "",
  start_date: "",
  end_date: "",
  reason: "",
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function InputIconWrap({ icon: Icon, children }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-[#061006]/80 border border-lime-400/20 flex items-center justify-center pointer-events-none">
        <Icon className="w-4 h-4 text-lime-100/55" />
      </div>
      {children}
    </div>
  );
}

export default function LeaveRequestForm({ open, onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setFormData(initialForm);
      setErrors({});
    }
  }, [open]);

  const selectedLeaveType = leaveTypes.find((t) => t.value === formData.leave_type);
  const SelectedTypeIcon = selectedLeaveType?.icon || CalendarDays;

  const totalDays = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return 0;

    try {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);

      if (isBefore(end, start)) return 0;

      return differenceInCalendarDays(end, start) + 1;
    } catch {
      return 0;
    }
  }, [formData.start_date, formData.end_date]);

  const validate = () => {
    const nextErrors = {};

    if (!formData.leave_type) {
      nextErrors.leave_type = "Please select a leave type.";
    }

    if (!formData.start_date) {
      nextErrors.start_date = "Please select a start date.";
    }

    if (!formData.end_date) {
      nextErrors.end_date = "Please select an end date.";
    }

    if (formData.start_date && isBefore(new Date(formData.start_date), startOfDay(new Date()))) {
      nextErrors.start_date = "Start date cannot be in the past.";
    }

    if (
      formData.start_date &&
      formData.end_date &&
      isBefore(new Date(formData.end_date), new Date(formData.start_date))
    ) {
      nextErrors.end_date = "End date cannot be before start date.";
    }

    if (!formData.reason.trim()) {
      nextErrors.reason = "Please enter a reason.";
    } else if (formData.reason.trim().length < 8) {
      nextErrors.reason = "Reason is too short.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl border border-lime-400/15 bg-black text-white rounded-[2rem] p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-lime-400/10 via-transparent to-emerald-500/10 pointer-events-none" />

          <div className="relative p-6 md:p-7 border-b border-lime-400/15">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                <div className="w-11 h-11 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                  <SelectedTypeIcon className="w-5 h-5 text-lime-300" />
                </div>
                Request Leave
              </DialogTitle>
              <DialogDescription className="text-lime-100/55">
                Submit your leave request with date range and reason.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-7 space-y-5">
            {/* Leave Type */}
            <div className="space-y-2">
              <Label className="text-white">Leave Type</Label>
              <Select
                value={formData.leave_type}
                onValueChange={(value) => handleFieldChange("leave_type", value)}
              >
                <SelectTrigger className="h-12 rounded-2xl border-lime-400/15 bg-[#020806]/90 text-white focus:ring-lime-400/20">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent className="bg-[#020806]/90 border-lime-400/15 text-white">
                  {leaveTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        className="focus:bg-lime-400/10 focus:text-white"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-lime-100/55" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.leave_type && (
                <p className="text-sm text-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.leave_type}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label className="text-white">Start Date</Label>
                <InputIconWrap icon={CalendarDays}>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFieldChange("start_date", e.target.value)}
                    className="h-12 rounded-2xl border-lime-400/15 bg-[#020806]/90 text-white pl-14 pr-4 [color-scheme:dark]"
                  />
                </InputIconWrap>
                {errors.start_date && (
                  <p className="text-sm text-rose-300 flex items-center gap-1 break-words">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.start_date}
                  </p>
                )}
              </div>

              <div className="space-y-2 min-w-0">
                <Label className="text-white">End Date</Label>
                <InputIconWrap icon={CalendarDays}>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFieldChange("end_date", e.target.value)}
                    className="h-12 rounded-2xl border-lime-400/15 bg-[#020806]/90 text-white pl-14 pr-4 [color-scheme:dark]"
                  />
                </InputIconWrap>
                {errors.end_date && (
                  <p className="text-sm text-rose-300 flex items-center gap-1 break-words">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.end_date}
                  </p>
                )}
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-lime-400/15 bg-[#020806]/90/70 px-4 py-4 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center">
                    <Clock3 className="w-4 h-4 text-lime-300" />
                  </div>
                  <span className="text-xs font-medium text-lime-100/55">Total Leave Days</span>
                </div>
                <p className="text-lg font-semibold text-white break-words">
                  {totalDays > 0 ? `${totalDays} day${totalDays > 1 ? 's' : ''}` : "--"}
                </p>
              </div>

              <div className="rounded-2xl border border-lime-400/15 bg-[#020806]/90/70 px-4 py-4 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-lime-100/55">Selected Range</span>
                </div>
                <p className="text-sm font-medium text-white break-words">
                  {formData.start_date && formData.end_date
                    ? `${format(new Date(formData.start_date), "dd MMM yyyy")} → ${format(new Date(formData.end_date), "dd MMM yyyy")}`
                    : "Choose start and end dates"}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-white">Reason</Label>
              <Textarea
                placeholder="Please provide a reason for your leave..."
                value={formData.reason}
                onChange={(e) => handleFieldChange("reason", e.target.value)}
                rows={4}
                className="rounded-2xl border-lime-400/15 bg-[#020806]/90 text-white placeholder:text-lime-100/45 resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                {errors.reason ? (
                  <p className="text-sm text-rose-300 flex items-center gap-1 break-words">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.reason}
                  </p>
                ) : (
                  <p className="text-xs text-lime-100/45">
                    Briefly explain why you need this leave.
                  </p>
                )}

                <span className="text-xs text-lime-100/45 shrink-0">
                  {formData.reason.trim().length}/200
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
                disabled={isLoading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !formData.leave_type ||
                  !formData.start_date ||
                  !formData.end_date ||
                  !formData.reason.trim()
                }
                className="flex-1 h-12 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}