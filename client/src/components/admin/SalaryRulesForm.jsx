import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Loader2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

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

export default function SalaryRulesForm({ appSettings, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    currency: 'INR',
    currency_symbol: '₹',
    late_penalty: 100,
    half_day_deduction: 500,
    overtime_rate_per_hour: 250,
    overtime_multiplier: 1.5,
    working_days_per_month: 22,
    standard_hours_per_day: 8,
  });

  // Initialize form with app settings
  useEffect(() => {
    if (appSettings) {
      setFormData({
        currency: appSettings.currency || 'INR',
        currency_symbol: appSettings.currency_symbol || '₹',
        late_penalty: appSettings.late_penalty || 100,
        half_day_deduction: appSettings.half_day_deduction || 500,
        overtime_rate_per_hour: appSettings.overtime_rate_per_hour || 250,
        overtime_multiplier: appSettings.overtime_multiplier || 1.5,
        working_days_per_month: appSettings.working_days_per_month || 22,
        standard_hours_per_day: appSettings.standard_hours_per_day || 8,
      });
    }
  }, [appSettings]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.appSettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Salary rules updated successfully');
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update salary rules');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(value) ? value : parseFloat(value),
    }));
  };

  const handleCurrencyChange = (value) => {
    const currencySymbols = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };

    setFormData((prev) => ({
      ...prev,
      currency: value,
      currency_symbol: currencySymbols[value] || value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Card
      style={{
        background: THEME.surface,
        borderColor: THEME.border,
      }}
      className="border rounded-2xl p-6"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-6 h-6" style={{ color: THEME.accent }} />
          <h2 className="text-2xl font-semibold" style={{ color: THEME.text }}>
            Salary Management Rules
          </h2>
        </div>
        <p style={{ color: THEME.muted }} className="text-sm">
          Configure global deduction rules and salary calculation parameters
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Currency Section */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: THEME.surface2,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: THEME.text }}
          >
            Currency Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency" style={{ color: THEME.text }}>
                Currency
              </Label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger
                  style={{
                    background: THEME.surface,
                    borderColor: THEME.border,
                    color: THEME.text,
                  }}
                  className="mt-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: THEME.surface }}>
                  <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                  <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                  <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency_symbol" style={{ color: THEME.text }}>
                Currency Symbol
              </Label>
              <Input
                id="currency_symbol"
                name="currency_symbol"
                value={formData.currency_symbol}
                onChange={handleChange}
                style={{ borderColor: THEME.border }}
                className="mt-1"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        {/* Deduction Rules Section */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: THEME.surface2,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: THEME.text }}
          >
            Deduction Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="late_penalty" style={{ color: THEME.text }}>
                Late Penalty (per occurrence)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ color: THEME.muted }}>{formData.currency_symbol}</span>
                <Input
                  id="late_penalty"
                  name="late_penalty"
                  type="number"
                  value={formData.late_penalty}
                  onChange={handleChange}
                  style={{ borderColor: THEME.border }}
                  step="10"
                  min="0"
                />
              </div>
              <p style={{ color: THEME.muted }} className="text-xs mt-1">
                Deducted for each late check-in
              </p>
            </div>

            <div>
              <Label htmlFor="half_day_deduction" style={{ color: THEME.text }}>
                Half-Day Deduction
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ color: THEME.muted }}>{formData.currency_symbol}</span>
                <Input
                  id="half_day_deduction"
                  name="half_day_deduction"
                  type="number"
                  value={formData.half_day_deduction}
                  onChange={handleChange}
                  style={{ borderColor: THEME.border }}
                  step="50"
                  min="0"
                />
              </div>
              <p style={{ color: THEME.muted }} className="text-xs mt-1">
                Deducted for half-day attendance
              </p>
            </div>
          </div>
        </div>

        {/* Overtime Section */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: THEME.surface2,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: THEME.text }}
          >
            Overtime Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="overtime_rate_per_hour" style={{ color: THEME.text }}>
                Overtime Rate per Hour
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ color: THEME.muted }}>{formData.currency_symbol}</span>
                <Input
                  id="overtime_rate_per_hour"
                  name="overtime_rate_per_hour"
                  type="number"
                  value={formData.overtime_rate_per_hour}
                  onChange={handleChange}
                  style={{ borderColor: THEME.border }}
                  step="10"
                  min="0"
                />
              </div>
              <p style={{ color: THEME.muted }} className="text-xs mt-1">
                Base hourly rate for overtime calculation
              </p>
            </div>

            <div>
              <Label htmlFor="overtime_multiplier" style={{ color: THEME.text }}>
                Overtime Multiplier
              </Label>
              <Input
                id="overtime_multiplier"
                name="overtime_multiplier"
                type="number"
                value={formData.overtime_multiplier}
                onChange={handleChange}
                style={{ borderColor: THEME.border }}
                step="0.1"
                min="0"
                className="mt-1"
              />
              <p style={{ color: THEME.muted }} className="text-xs mt-1">
                Multiplier applied to hourly rate (e.g., 1.5x)
              </p>
            </div>
          </div>
        </div>

        {/* Working Hours Section */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: THEME.surface2,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: THEME.text }}
          >
            Working Hours Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="working_days_per_month" style={{ color: THEME.text }}>
                Working Days per Month
              </Label>
              <Input
                id="working_days_per_month"
                name="working_days_per_month"
                type="number"
                value={formData.working_days_per_month}
                onChange={handleChange}
                style={{ borderColor: THEME.border }}
                step="1"
                min="1"
                max="31"
                className="mt-1"
              />
              <p style={{ color: THEME.muted }} className="text-xs mt-1">
                Standard working days (usually 22-26)
              </p>
            </div>

            <div>
              <Label htmlFor="standard_hours_per_day" style={{ color: THEME.text }}>
                Standard Hours per Day
              </Label>
              <Input
                id="standard_hours_per_day"
                name="standard_hours_per_day"
                type="number"
                value={formData.standard_hours_per_day}
                onChange={handleChange}
                style={{ borderColor: THEME.border }}
                step="0.5"
                min="1"
                className="mt-1"
              />
              <p style={{ color: THEME.muted }} className="text-xs mt-1">
                Expected daily working hours (usually 8-10)
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div
          className="p-4 rounded-lg border flex gap-3"
          style={{
            background: `${THEME.accent}08`,
            borderColor: `${THEME.accent}40`,
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: THEME.accent }} />
          <div>
            <p style={{ color: THEME.text }} className="text-sm font-medium">
              These settings affect salary calculations globally
            </p>
            <p style={{ color: THEME.muted }} className="text-xs mt-1">
              Any changes will apply to payslips generated after this update. Existing payslips remain unchanged.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            style={{
              background: THEME.accent,
              color: THEME.accentTextDark,
            }}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Salary Rules'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
