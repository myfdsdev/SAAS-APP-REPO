import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock4, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { showAppConfirm } from "@/components/ui/app-alert";

const fieldClass =
  "bg-black border-lime-400/15 text-white placeholder:text-lime-100/30 focus-visible:ring-lime-400/30";

const labelClass = "text-xs font-semibold uppercase tracking-wider text-lime-100/45";

export default function CustomShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", start_time: "09:00", end_time: "18:00" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.shifts.list();
      setShifts(data || []);
    } catch (err) {
      toast.error(err?.error || "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!draft.name.trim()) {
      toast.error("Shift name is required");
      return;
    }
    try {
      await base44.shifts.create(draft);
      toast.success("Shift created");
      setDraft({ name: "", start_time: "09:00", end_time: "18:00" });
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err?.error || "Failed to create shift");
    }
  };

  const handleUpdate = async (id) => {
    if (!draft.name.trim()) {
      toast.error("Shift name is required");
      return;
    }

    try {
      await base44.shifts.update(id, draft);
      toast.success("Shift updated");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err?.error || "Failed to update shift");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showAppConfirm({
      title: "Delete this shift?",
      description: "Employees assigned to it will be unassigned.",
      actionLabel: "Delete shift",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await base44.shifts.remove(id);
      toast.success("Shift deleted");
      load();
    } catch (err) {
      toast.error(err?.error || "Failed to delete shift");
    }
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setDraft({ name: s.name, start_time: s.start_time, end_time: s.end_time });
  };

  return (
    <Card className="border-lime-400/15 bg-black overflow-hidden">
      <CardHeader className="border-b border-lime-400/15 bg-[#020806]/80">
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime-400/15 bg-lime-400/10">
            <Clock4 className="w-5 h-5 text-lime-300" />
          </span>
          <span>Custom Shifts</span>
        </CardTitle>
        <CardDescription className="text-lime-100/45">
          Create named shifts (e.g. Morning, Night) and assign them to specific employees.
          An employee with an assigned shift overrides the global office hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-lime-400/10 bg-[#020806] px-4 py-6 text-center text-sm text-lime-100/35">
            Loading shifts...
          </div>
        ) : shifts.length === 0 && !creating ? (
          <div className="rounded-xl border border-dashed border-lime-400/15 bg-[#020806] px-4 py-8 text-center">
            <Clock4 className="mx-auto mb-3 h-8 w-8 text-lime-100/25" />
            <p className="text-sm font-medium text-lime-100/65">No custom shifts yet.</p>
            <p className="mt-1 text-xs text-lime-100/35">
              Add a shift to create alternate office timings.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {shifts.map((s) =>
              editingId === s._id ? (
                <div
                  key={s._id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end p-4 border border-lime-400/20 rounded-xl bg-[#020806]"
                >
                  <div>
                    <Label className={labelClass}>Name</Label>
                    <Input
                      className={fieldClass}
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className={labelClass}>Start</Label>
                    <Input
                      className={fieldClass}
                      type="time"
                      value={draft.start_time}
                      onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className={labelClass}>End</Label>
                    <Input
                      className={fieldClass}
                      type="time"
                      value={draft.end_time}
                      onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      onClick={() => handleUpdate(s._id)}
                      className="h-10 w-10 bg-lime-400 text-black hover:bg-lime-300"
                      title="Save shift"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      className="h-10 w-10 border-lime-400/15 bg-black text-lime-100/65 hover:bg-lime-400/10 hover:text-white"
                      title="Cancel edit"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={s._id}
                  className="flex items-center justify-between gap-4 p-4 border border-lime-400/10 rounded-xl bg-[#020806] transition-colors hover:border-lime-400/25 hover:bg-[#061006]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-400/15 bg-lime-400/10">
                      <Clock4 className="h-5 w-5 text-lime-300" />
                    </div>
                    <div className="min-w-0">
                    <div className="font-semibold text-white">{s.name}</div>
                    <div className="text-sm text-lime-100/50">
                      {s.start_time} - {s.end_time}
                    </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => startEdit(s)}
                      className="h-9 w-9 border-lime-400/15 bg-black text-lime-100/65 hover:bg-lime-400/10 hover:text-white"
                      title="Edit shift"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={() => handleDelete(s._id)}
                      title="Delete shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {creating ? (
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end p-4 border-2 border-dashed border-lime-400/20 rounded-xl bg-[#020806]">
            <div>
              <Label className={labelClass}>Name</Label>
              <Input
                className={fieldClass}
                placeholder="e.g. Morning Shift"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label className={labelClass}>Start</Label>
              <Input
                className={fieldClass}
                type="time"
                value={draft.start_time}
                onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label className={labelClass}>End</Label>
              <Input
                className={fieldClass}
                type="time"
                value={draft.end_time}
                onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                onClick={handleCreate}
                className="h-10 w-10 bg-lime-400 text-black hover:bg-lime-300"
                title="Create shift"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 border-lime-400/15 bg-black text-lime-100/65 hover:bg-lime-400/10 hover:text-white"
                onClick={() => {
                  setCreating(false);
                  setDraft({ name: "", start_time: "09:00", end_time: "18:00" });
                }}
                title="Cancel create"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setCreating(true)}
            className="w-full border-dashed border-lime-400/20 bg-black text-lime-100/70 hover:bg-lime-400/10 hover:text-white hover:border-lime-400/35"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add new shift
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
