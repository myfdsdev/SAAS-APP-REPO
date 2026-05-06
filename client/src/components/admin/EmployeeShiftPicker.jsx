import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock4 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function EmployeeShiftPicker({ employee, onUpdated }) {
  const [shifts, setShifts] = useState([]);
  const [selected, setSelected] = useState(
    employee?.shift_id?._id || employee?.shift_id || ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.shifts.list().then(setShifts).catch(() => setShifts([]));
  }, []);

  useEffect(() => {
    setSelected(employee?.shift_id?._id || employee?.shift_id || "");
  }, [employee?.shift_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.shifts.assignToUser(
        employee.id || employee._id,
        selected || null
      );
      toast.success(selected ? "Shift assigned" : "Shift removed");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.error || "Failed to update shift");
    } finally {
      setSaving(false);
    }
  };

  const currentShift = shifts.find((s) => s._id === selected);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock4 className="w-5 h-5 text-indigo-600" />
          Shift Assignment
        </CardTitle>
        <CardDescription>
          Choose a custom shift for this employee. Leave as "None (use global office hours)" to follow company-wide hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">None (use global office hours)</option>
          {shifts.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} ({s.start_time} – {s.end_time})
            </option>
          ))}
        </select>

        {currentShift && (
          <div className="text-xs text-gray-500">
            Selected: <span className="font-semibold text-gray-700">{currentShift.name}</span> — {currentShift.start_time} to {currentShift.end_time}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {saving ? "Saving..." : "Save Shift"}
        </Button>
      </CardContent>
    </Card>
  );
}
