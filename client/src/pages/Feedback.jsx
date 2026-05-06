import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Loader2,
  MessageSquarePlus,
  Send,
  Star,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const categoryOptions = [
  { value: "experience", label: "App experience" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "attendance", label: "Attendance" },
  { value: "payroll", label: "Payroll" },
  { value: "other", label: "Other" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusOptions = ["new", "reviewing", "resolved", "closed"];

const statusStyles = {
  new: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  reviewing: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  closed: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200",
};

const emptyForm = {
  subject: "",
  message: "",
  category: "experience",
  priority: "normal",
  rating: 5,
  allow_contact: true,
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function FeedbackCard({ item, isAdmin, onUpdate }) {
  const [status, setStatus] = useState(item.status);
  const [adminNote, setAdminNote] = useState(item.admin_note || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id || item._id, { status, admin_note: adminNote });
      toast.success("Feedback updated");
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not update feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-lime-400/10 bg-[#030806] text-white shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base text-white">{item.subject}</CardTitle>
            <p className="mt-1 text-sm text-lime-100/50">
              {isAdmin ? `${item.employee_name} • ${item.employee_email}` : "Submitted"} on{" "}
              {formatDate(item.createdAt || item.created_date)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`w-fit capitalize ${statusStyles[item.status] || statusStyles.new}`}
          >
            {item.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-lime-400/15 text-lime-100/70 capitalize">
            {item.category}
          </Badge>
          <Badge variant="outline" className="border-lime-400/15 text-lime-100/70 capitalize">
            {item.priority}
          </Badge>
          <Badge variant="outline" className="border-lime-400/15 text-lime-100/70">
            {item.rating}/5
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-lime-50/80">
          {item.message}
        </p>

        {isAdmin && (
          <div className="grid gap-3 border-t border-lime-400/10 pt-4 md:grid-cols-[180px_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label className="text-lime-100/65">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="border-lime-400/15 bg-black/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-lime-100/65">Admin note</Label>
              <Textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                className="min-h-10 border-lime-400/15 bg-black/30 text-white"
                placeholder="Add an internal note"
              />
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-lime-400 text-black hover:bg-lime-300"
            >
              {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Feedback() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [mine, setMine] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  const stats = useMemo(() => {
    const source = isAdmin ? allFeedback : mine;
    return {
      total: source.length,
      active: source.filter((item) => ["new", "reviewing"].includes(item.status)).length,
      resolved: source.filter((item) => item.status === "resolved").length,
    };
  }, [allFeedback, isAdmin, mine]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const myFeedback = await base44.feedback.mine();
      setMine(myFeedback);

      if (isAdmin) {
        const result = await base44.feedback.all();
        setAllFeedback(result.feedback || []);
      }
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [isAdmin]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await base44.feedback.create(form);
      setForm(emptyForm);
      toast.success("Feedback sent");
      await loadFeedback();
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id, data) => {
    const updated = await base44.feedback.update(id, data);
    setAllFeedback((items) =>
      items.map((item) => ((item.id || item._id) === id ? updated : item)),
    );
    return updated;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-lime-400/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-lime-400/15 bg-lime-400/10 text-lime-300">
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-white">
              Feedback
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-lime-100/55">
              Send product feedback, bug reports, or workplace requests to the admin team.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <div className="rounded-md border border-lime-400/10 bg-[#030806] p-3">
              <p className="text-xs text-lime-100/45">Total</p>
              <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-md border border-lime-400/10 bg-[#030806] p-3">
              <p className="text-xs text-lime-100/45">Active</p>
              <p className="mt-1 text-2xl font-semibold">{stats.active}</p>
            </div>
            <div className="rounded-md border border-lime-400/10 bg-[#030806] p-3">
              <p className="text-xs text-lime-100/45">Resolved</p>
              <p className="mt-1 text-2xl font-semibold">{stats.resolved}</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="border border-lime-400/10 bg-[#030806]">
            <TabsTrigger value="send">Send feedback</TabsTrigger>
            <TabsTrigger value="mine">My feedback</TabsTrigger>
            {isAdmin && <TabsTrigger value="inbox">Admin inbox</TabsTrigger>}
          </TabsList>

          <TabsContent value="send" className="mt-6 bg-transparent">
            <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-lime-100/70">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(event) => updateForm("subject", event.target.value)}
                    maxLength={140}
                    required
                    className="border-lime-400/15 bg-[#030806] text-white"
                    placeholder="Short summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-lime-100/70">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(event) => updateForm("message", event.target.value)}
                    minLength={10}
                    maxLength={4000}
                    required
                    className="min-h-52 border-lime-400/15 bg-[#030806] text-white"
                    placeholder="Tell the team what happened or what you would like improved"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 rounded-md border border-lime-400/10 bg-[#030806] p-4">
                  <div className="space-y-2">
                    <Label className="text-lime-100/70">Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) => updateForm("category", value)}
                    >
                      <SelectTrigger className="border-lime-400/15 bg-black/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lime-100/70">Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(value) => updateForm("priority", value)}
                    >
                      <SelectTrigger className="border-lime-400/15 bg-black/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lime-100/70">Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => updateForm("rating", rating)}
                          className="rounded-md p-1 text-lime-100/35 transition hover:bg-lime-400/10 hover:text-lime-300"
                          aria-label={`${rating} star rating`}
                        >
                          <Star
                            className={`h-6 w-6 ${
                              rating <= form.rating
                                ? "fill-lime-300 text-lime-300"
                                : ""
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-md border border-lime-400/10 bg-black/20 p-3">
                    <Label htmlFor="allow_contact" className="text-sm text-lime-100/70">
                      Allow admin to contact me
                    </Label>
                    <Switch
                      id="allow_contact"
                      checked={form.allow_contact}
                      onCheckedChange={(value) => updateForm("allow_contact", value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-lime-400 text-black hover:bg-lime-300"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                  Send feedback
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="mine" className="mt-6 bg-transparent">
            {loading ? (
              <div className="flex items-center gap-2 text-lime-100/55">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading feedback
              </div>
            ) : mine.length ? (
              <div className="grid gap-4">
                {mine.map((item) => (
                  <FeedbackCard key={item.id || item._id} item={item} isAdmin={false} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-lime-400/15 text-center">
                <Inbox className="mb-3 h-7 w-7 text-lime-100/35" />
                <p className="text-sm text-lime-100/55">No feedback sent yet.</p>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="inbox" className="mt-6 bg-transparent">
              {loading ? (
                <div className="flex items-center gap-2 text-lime-100/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading inbox
                </div>
              ) : allFeedback.length ? (
                <div className="grid gap-4">
                  {allFeedback.map((item) => (
                    <FeedbackCard
                      key={item.id || item._id}
                      item={item}
                      isAdmin
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-lime-400/15 text-center">
                  <AlertCircle className="mb-3 h-7 w-7 text-lime-100/35" />
                  <p className="text-sm text-lime-100/55">No team feedback yet.</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
