import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings as SettingsIcon,
  Trash2,
  KeyRound,
  Save,
  Power,
  PowerOff,
  Clock4,
  Shield,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { showAppConfirm } from "@/components/ui/app-alert";

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "—";
  }
};

export default function ManageUserCard({ employee, onUpdated }) {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    employee_id: "",
    department: "",
    mobile_number: "",
    role: "user",
    is_active: true,
    shift_id: "",
  });

  useEffect(() => {
    base44.shifts.list().then(setShifts).catch(() => setShifts([]));
  }, []);

  useEffect(() => {
    if (!employee) return;
    setForm({
      full_name: employee.full_name || "",
      employee_id: employee.employee_id || "",
      department: employee.department || "",
      mobile_number: employee.mobile_number || "",
      role: employee.role || "user",
      is_active: employee.is_active !== false,
      shift_id: employee.shift_id?._id || employee.shift_id || "",
    });
  }, [employee]);

  const userId = employee?.id || employee?._id;

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!form.employee_id.trim()) {
      toast.error("Employee ID is required");
      return;
    }

    if (!form.department.trim()) {
      toast.error("Department is required");
      return;
    }

    if (form.mobile_number && form.mobile_number.trim().length < 8) {
      toast.error("Mobile number looks too short");
      return;
    }

    setSaving(true);
    try {
      const updated = await base44.users.adminUpdate(userId, {
        full_name: form.full_name,
        employee_id: form.employee_id,
        department: form.department,
        mobile_number: form.mobile_number,
        role: form.role,
        is_active: form.is_active,
      });

      // Shift assignment goes through its own endpoint
      const currentShift = employee.shift_id?._id || employee.shift_id || "";
      if (form.shift_id !== currentShift) {
        await base44.shifts.assignToUser(userId, form.shift_id || null);
      }

      toast.success("User updated");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.error || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    const confirmed = await showAppConfirm({
      title: "Send password reset?",
      description: `Send a password-reset email to ${employee.email}?`,
      actionLabel: "Send reset email",
    });

    if (!confirmed) return;

    setResetting(true);
    try {
      await base44.users.sendPasswordReset(userId);
      toast.success("Password reset email sent");
    } catch (err) {
      toast.error(err?.error || "Failed to send reset email");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showAppConfirm({
      title: "Delete this user?",
      description: `Permanently delete ${employee.email}? This cannot be undone.`,
      actionLabel: "Delete user",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      await base44.users.adminDelete(userId);
      toast.success("User deleted");
      navigate("/AdminDashboard");
    } catch (err) {
      toast.error(err?.error || "Failed to delete user");
      setDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-lime-400/15 bg-[#020806] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <SettingsIcon className="w-5 h-5 text-lime-300" />
          Manage User
        </CardTitle>
        <CardDescription className="text-lime-100/45">
          Edit profile, role, status, shift, and security actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Editable fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-lime-100/75">Full name</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-lime-100/75">Employee ID</Label>
            <Input
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-lime-100/75">Department</Label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-lime-100/75">Mobile number</Label>
            <Input
              value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
              className="border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-lime-100/75">Role</Label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-lime-400/15 bg-black p-1">
              {[
                { value: "user", label: "Employee", icon: User },
                { value: "admin", label: "Admin", icon: Shield },
              ].map((role) => {
                const Icon = role.icon;
                const active = form.role === role.value;

                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setForm({ ...form, role: role.value })}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                      active
                        ? "bg-lime-400 text-black shadow-[0_0_18px_rgba(163,211,18,0.22)]"
                        : "text-lime-100/55 hover:bg-lime-400/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {role.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-lime-100/75">
              <Clock4 className="w-4 h-4" /> Shift
            </Label>
            <select
              value={form.shift_id}
              onChange={(e) => setForm({ ...form, shift_id: e.target.value })}
              className="h-10 w-full rounded-xl border border-lime-400/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-lime-400/40"
            >
              <option value="">None (use global office hours)</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.start_time} – {s.end_time})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex flex-col gap-3 rounded-2xl border border-lime-400/15 bg-black p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              {form.is_active ? (
                <Power className="w-4 h-4 text-lime-300" />
              ) : (
                <PowerOff className="w-4 h-4 text-rose-600" />
              )}
              Account {form.is_active ? "Active" : "Deactivated"}
            </div>
            <div className="text-xs text-lime-100/45">
              {form.is_active
                ? "User can log in and use the app."
                : "User cannot log in. Existing sessions are disconnected."}
            </div>
          </div>
          <Button
            type="button"
            variant={form.is_active ? "outline" : "default"}
            className={
              form.is_active
                ? "border-rose-400/25 bg-transparent text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                : "bg-lime-400 text-black hover:bg-lime-300"
            }
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
          >
            {form.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>

        {/* Read-only metadata */}
        <div className="grid gap-3 rounded-2xl border border-lime-400/15 bg-black p-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-lime-100/40">Email</div>
            <div className="break-words font-medium text-lime-100/80">{employee.email}</div>
          </div>
          <div>
            <div className="text-lime-100/40">Auth provider</div>
            <div className="font-medium text-lime-100/80 capitalize">
              {employee.auth_provider || "local"}
            </div>
          </div>
          <div>
            <div className="text-lime-100/40">Created</div>
            <div className="font-medium text-lime-100/80">
              {formatDate(employee.createdAt || employee.created_date)}
            </div>
          </div>
          <div>
            <div className="text-lime-100/40">Last updated</div>
            <div className="font-medium text-lime-100/80">
              {formatDate(employee.updatedAt || employee.updated_date)}
            </div>
          </div>
          <div>
            <div className="text-lime-100/40">Last active</div>
            <div className="font-medium text-lime-100/80">{formatDate(employee.last_active)}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 border-t border-lime-400/15 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-lime-400 font-bold text-black hover:bg-lime-300"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={resetting || employee.auth_provider === "google"}
            onClick={handleSendReset}
            className="border-lime-400/15 bg-transparent text-lime-100/75 hover:bg-lime-400/10 hover:text-white"
            title={
              employee.auth_provider === "google"
                ? "Google-authenticated users cannot reset password"
                : ""
            }
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {resetting ? "Sending..." : "Send password reset"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="ml-auto border-rose-400/25 bg-transparent text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? "Deleting..." : "Delete user"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
