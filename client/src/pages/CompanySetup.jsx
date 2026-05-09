import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  FolderOpen,
  Info,
  LockKeyhole,
  LogIn,
  LogOut,
  MoreVertical,
  Pin,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserMinus,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useCompany } from "@/lib/CompanyContext";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sizes = ["1-10", "11-50", "51-200", "200+"];

// Per-status visual identity for blocked workspaces. Each entry drives the
// row's border/badge colors, the icon, the headline used in the toast, and
// the default fallback message if the platform team didn't set a reason.
const STATUS_STYLES = {
  deleted: {
    label: "Deleted",
    icon: Trash2,
    rowBorder: "border-rose-500/30",
    rowBg: "bg-rose-500/[0.05]",
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    iconColor: "text-rose-400",
    avatar: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    button:
      "border-rose-500/30 bg-rose-500/5 text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/10",
    headline: "Workspace deleted",
    fallback:
      "This workspace has been permanently deleted by the platform team.",
  },
  banned: {
    label: "Banned",
    icon: Ban,
    rowBorder: "border-red-700/40",
    rowBg: "bg-red-900/[0.08]",
    badge: "border-red-600/50 bg-red-900/30 text-red-300",
    iconColor: "text-red-400",
    avatar: "border-red-700/40 bg-red-900/30 text-red-300",
    button:
      "border-red-700/40 bg-red-900/20 text-red-300 hover:border-red-500/60 hover:bg-red-900/30",
    headline: "Workspace banned",
    fallback:
      "This workspace has been banned for policy violations. Contact support if you believe this is a mistake.",
  },
  blocked: {
    label: "Blocked",
    icon: LockKeyhole,
    rowBorder: "border-amber-500/30",
    rowBg: "bg-amber-500/[0.05]",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    iconColor: "text-amber-400",
    avatar: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    button:
      "border-amber-500/30 bg-amber-500/5 text-amber-300 hover:border-amber-400/60 hover:bg-amber-500/10",
    headline: "Workspace blocked",
    fallback:
      "This workspace has been blocked by the platform team while we review it.",
  },
  suspended: {
    label: "Suspended",
    icon: Clock,
    rowBorder: "border-sky-500/30",
    rowBg: "bg-sky-500/[0.05]",
    badge: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    iconColor: "text-sky-400",
    avatar: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    button:
      "border-sky-500/30 bg-sky-500/5 text-sky-300 hover:border-sky-400/60 hover:bg-sky-500/10",
    headline: "Workspace suspended",
    fallback:
      "This workspace is temporarily suspended. Access will be restored shortly.",
  },
};

const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.blocked;

const formatSuspendedUntil = (date) => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

export default function CompanySetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUserState, refreshUser, logout } = useAuth();
  const { refreshCompany } = useCompany();
  const inviteCode = searchParams.get("code") || "";
  const inviteToken = searchParams.get("invite") || "";
  // Three-step flow: "choose" (hero chooser), "create", "join".
  // If user came in via an invite link, skip the chooser.
  const [mode, setMode] = useState(inviteCode ? "join" : "choose");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    industry: "",
    company_size: "",
    logo: "",
    favicon: "",
  });
  const [joinForm, setJoinForm] = useState({
    invite_code: inviteCode.toUpperCase(),
    invite_token: inviteToken,
  });

  // Past workspaces this user has access to (for the "Your workspaces" list).
  const [workspaces, setWorkspaces] = useState([]);
  const [switchingId, setSwitchingId] = useState(null);
  // GitHub-style delete confirmation modal: stores the workspace pending
  // deletion. Null when the modal is closed.
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.companies
      .workspaces()
      .then((rows) => {
        if (alive) setWorkspaces(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const switchToWorkspace = async (companyId) => {
    setSwitchingId(companyId);
    try {
      const result = await base44.companies.switch(companyId);
      if (result.user) updateUserState(result.user);
      await refreshUser();
      await refreshCompany();
      window.dispatchEvent(new Event("app-settings-refresh"));
      navigate(
        createPageUrl(result.user?.role === "admin" ? "AdminDashboard" : "Dashboard"),
        { replace: true },
      );
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not switch workspace");
    } finally {
      setSwitchingId(null);
    }
  };

  // Show a status-specific notice when the user tries to enter a blocked
  // workspace. Each status (deleted/banned/blocked/suspended) has its own
  // color, icon, headline, and fallback message defined in STATUS_STYLES.
  const showBlockedNotice = (workspace) => {
    const status = workspace.block_status || "blocked";
    const style = getStatusStyle(status);
    const Icon = style.icon;
    const reason = workspace.block_reason || style.fallback;
    const until = formatSuspendedUntil(workspace.company?.suspended_until);

    toast(
      (t) => (
        <div className="flex max-w-sm gap-3">
          <Icon className={`h-5 w-5 shrink-0 ${style.iconColor}`} />
          <div className="flex-1 text-sm">
            <div className={`font-semibold ${style.iconColor}`}>
              {style.headline}
            </div>
            <p className="mt-1 text-xs text-white/70">{reason}</p>
            {status === "suspended" && until && (
              <p className="mt-1 text-xs text-sky-300/80">
                Suspended until {until}
              </p>
            )}
            <button
              onClick={() => toast.dismiss(t.id)}
              className="mt-2 text-xs text-lime-300 hover:underline"
            >
              Got it
            </button>
          </div>
        </div>
      ),
      { duration: 8000, position: "top-center" },
    );
  };

  const suggestedPrefix = useMemo(() => {
    const words = createForm.name.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) return words.map((word) => word[0]).join("").toUpperCase().slice(0, 4);
    return (words[0] || "COM").slice(0, 3).toUpperCase();
  }, [createForm.name]);

  const finishSetup = async (result) => {
    if (result.user) updateUserState(result.user);
    await refreshUser();
    await refreshCompany();
    window.dispatchEvent(new Event("app-settings-refresh"));
    navigate(createPageUrl(result.user?.role === "admin" ? "AdminDashboard" : "Dashboard"), {
      replace: true,
    });
  };

  const uploadImage = async (field, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(field);
    try {
      const result = await base44.integrations.Core.UploadFile({
        file,
        folder: field === "favicon" ? "company-favicons" : "company-logos",
      });
      setCreateForm((prev) => ({ ...prev, [field]: result.file_url || result.url }));
      toast.success(field === "favicon" ? "Favicon uploaded" : "Logo uploaded");
    } catch (error) {
      toast.error(error?.error || error?.message || "Upload failed");
    } finally {
      setUploading("");
    }
  };

  const createCompany = async (event) => {
    event.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);
    try {
      const result = await base44.companies.create({
        ...createForm,
        prefix: suggestedPrefix,
      });
      toast.success("Company created");
      await finishSetup(result);
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not create company");
    } finally {
      setSaving(false);
    }
  };

  const joinCompany = async (event) => {
    event.preventDefault();
    const code = joinForm.invite_code.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Invite code must be 6 characters");
      return;
    }

    setSaving(true);
    try {
      const result = await base44.companies.join({
        invite_code: code,
        invite_token: joinForm.invite_token,
      });
      toast.success("Company joined");
      await finishSetup(result);
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not join company");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "choose") {
    const firstName = user?.full_name?.split(" ")[0] || "there";
    const initial = (user?.full_name || user?.email || "?")[0].toUpperCase();

    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        {/* Animated background orbs */}
        <motion.div
          className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-lime-400/10 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-emerald-400/10 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(163,230,53,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top bar — matches the layout sketch:
            [AttendEase logo] ........ [👑 Super Admin] [G email pill] [Logout] */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-lime-400/30 bg-lime-400/10">
              <Sparkles className="h-4 w-4 text-lime-300" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-white">
              AttendEase
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user?.role === "super_admin" && (
              <button
                type="button"
                onClick={() => navigate(createPageUrl("SuperAdmin"))}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/20 hover:text-amber-100 hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]"
              >
                <Crown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Super Admin</span>
              </button>
            )}

            <div className="hidden items-center gap-2 rounded-full border border-lime-400/15 bg-black/40 px-3 py-1.5 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-black">
                {initial}
              </div>
              <span className="max-w-[160px] truncate text-xs text-lime-100/70">
                {user?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/15 bg-black/40 px-3 py-1.5 text-xs text-lime-100/70 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-4 pb-12 pt-8 md:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center md:mb-14"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-lime-400/30 bg-lime-400/10 shadow-[0_0_40px_rgba(163,230,53,0.15)]"
            >
              <Rocket className="h-8 w-8 text-lime-300" />
            </motion.div>

            <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1 text-xs font-medium text-lime-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
              </span>
              Account ready
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
              Hi {firstName}{" "}
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ delay: 0.6, duration: 1.4 }}
                className="inline-block origin-[70%_70%]"
              >
                👋
              </motion.span>
            </h1>
            <p className="mt-4 text-lg text-lime-100/60">
              You're signed in. One last step — pick how you want to start.
            </p>
          </motion.div>

          {/* Past workspaces — only show if user has any */}
          {workspaces.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mb-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-lime-100/60">
                  <FolderOpen className="h-4 w-4 text-lime-400" />
                  Your Workspaces
                </h2>
                <span className="text-xs text-lime-100/40">
                  {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"}
                </span>
              </div>
              <div className="space-y-2">
                {workspaces.map((w) => (
                  <WorkspaceRow
                    key={w.id || w.company?._id}
                    workspace={w}
                    busy={switchingId === w.company?._id}
                    onOpen={() =>
                      w.blocked
                        ? showBlockedNotice(w)
                        : switchToWorkspace(w.company?._id)
                    }
                    onShowNotice={() => showBlockedNotice(w)}
                    canDelete={
                      w.role === "admin" || user?.role === "super_admin"
                    }
                    onDelete={() => setPendingDelete(w)}
                    onSetDefault={async () => {
                      try {
                        await base44.companies.setDefault(w.company?._id);
                        const rows = await base44.companies.workspaces();
                        setWorkspaces(rows);
                        toast.success("Set as default workspace");
                      } catch (err) {
                        toast.error(err?.error || "Could not set default");
                      }
                    }}
                    onLeave={() => {
                      const isBlocked = !!w.blocked;
                      const headline = isBlocked
                        ? `Remove ${w.company?.name || "this workspace"} from your list?`
                        : `Leave ${w.company?.name || "this workspace"}?`;
                      const subtext = isBlocked
                        ? "It will disappear from your workspaces. The workspace itself is already inactive."
                        : "You'll need a new invite to rejoin.";
                      const ctaLabel = isBlocked ? "Yes, remove" : "Yes, leave";
                      const successMsg = isBlocked
                        ? "Removed from list"
                        : "Left workspace";
                      // Toast-based confirm — no native alert/confirm.
                      toast(
                        (t) => (
                          <div className="flex flex-col gap-2 text-sm">
                            <span className="font-semibold text-white">
                              {headline}
                            </span>
                            <span className="text-xs text-lime-100/60">
                              {subtext}
                            </span>
                            <div className="mt-1 flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  toast.dismiss(t.id);
                                  try {
                                    await base44.companies.leaveById(
                                      w.company?._id,
                                    );
                                    const rows = await base44.companies.workspaces();
                                    setWorkspaces(rows);
                                    await refreshUser();
                                    await refreshCompany();
                                    toast.success(successMsg);
                                  } catch (err) {
                                    toast.error(
                                      err?.error || "Could not remove workspace",
                                    );
                                  }
                                }}
                                className="rounded-md bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-400"
                              >
                                {ctaLabel}
                              </button>
                              <button
                                type="button"
                                onClick={() => toast.dismiss(t.id)}
                                className="rounded-md border border-lime-400/20 px-3 py-1 text-xs text-lime-100/80 hover:bg-lime-400/10"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ),
                        { duration: 8000, position: "top-center" },
                      );
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Path cards */}
          <div className="grid gap-5 md:grid-cols-2">
            <PathCard
              delay={0.2}
              icon={Building2}
              kicker="For founders & admins"
              title="Set up a new workspace"
              description="Create a private workspace for your company. You'll be the admin and can invite teammates with a unique code."
              cta="Create workspace"
              perks={[
                "Free for up to 100 employees",
                "Custom logo, colors & subdomain",
                "Set up in under 60 seconds",
              ]}
              onClick={() => setMode("create")}
            />
            <PathCard
              delay={0.3}
              icon={Users}
              kicker="For team members"
              title="Join an existing workspace"
              description="Got an invite code or email link from your admin? Enter it to join your team's workspace."
              cta="Enter invite code"
              perks={[
                "Use your 6-character invite code",
                "Or open the email invite link",
                "Each invite is unique to you",
              ]}
              onClick={() => setMode("join")}
            />
          </div>

          {/* Trust footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-lime-100/40"
          >
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-lime-400/70" /> Real-time sync
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-lime-400/70" /> Tenant-isolated
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-lime-400/70" /> Branded for your team
            </span>
          </motion.div>
        </main>

        <DeleteWorkspaceModal
          workspace={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onDeleted={async () => {
            setPendingDelete(null);
            const rows = await base44.companies.workspaces();
            setWorkspaces(rows);
            await refreshUser();
            await refreshCompany();
            toast.success("Workspace deleted");
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-lime-100/60 transition hover:text-lime-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
            {mode === "create" ? "New workspace" : "Join workspace"}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white md:text-4xl">
            {mode === "create"
              ? "Tell us about your company"
              : "Enter your invite code"}
          </h1>
          <p className="mt-2 text-sm text-lime-100/50">
            {mode === "create"
              ? "You'll be the workspace admin. You can change everything later."
              : "Your admin can find this in Company Settings → Invite code."}
          </p>
        </motion.div>

        <Card className="border-lime-400/15 bg-[#020806] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === "create" ? <Building2 className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              {mode === "create" ? "Create Company" : "Join Company"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "create" ? (
              <form onSubmit={createCompany} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company Name">
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="border-lime-400/15 bg-black"
                      placeholder="Fly Designs Studio"
                    />
                  </Field>
                  <Field label="Employee ID Prefix">
                    <Input value={suggestedPrefix} disabled className="border-lime-400/10 bg-black/70" />
                  </Field>
                  <Field label="Industry">
                    <Input
                      value={createForm.industry}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, industry: e.target.value }))}
                      className="border-lime-400/15 bg-black"
                      placeholder="Design, Software, Operations"
                    />
                  </Field>
                  <Field label="Company Size">
                    <Select
                      value={createForm.company_size}
                      onValueChange={(value) => setCreateForm((prev) => ({ ...prev, company_size: value }))}
                    >
                      <SelectTrigger className="border-lime-400/15 bg-black">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <UploadBox
                    label="Company Logo"
                    value={createForm.logo}
                    loading={uploading === "logo"}
                    onFile={(file) => uploadImage("logo", file)}
                  />
                  <UploadBox
                    label="Favicon"
                    value={createForm.favicon}
                    loading={uploading === "favicon"}
                    onFile={(file) => uploadImage("favicon", file)}
                  />
                </div>

                <Button disabled={saving || Boolean(uploading)} className="bg-lime-400 text-black hover:bg-lime-300">
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Create Company
                </Button>
              </form>
            ) : (
              <form onSubmit={joinCompany} className="max-w-md space-y-5">
                <Field label="Invite Code">
                  <Input
                    value={joinForm.invite_code}
                    maxLength={6}
                    onChange={(e) =>
                      setJoinForm((prev) => ({
                        ...prev,
                        invite_code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="h-12 border-lime-400/15 bg-black text-lg font-semibold tracking-[0.22em]"
                    placeholder="ABC123"
                  />
                </Field>
                <Button disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300">
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Join Company
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WorkspaceRow({ workspace, busy, onOpen, onSetDefault, onLeave, onShowNotice, canDelete, onDelete }) {
  const company = workspace.company || {};
  const initial = (company.name || "?")[0]?.toUpperCase() || "?";
  const blocked = !!workspace.blocked;
  const style = blocked ? getStatusStyle(workspace.block_status) : null;
  const StatusIcon = style?.icon;

  return (
    <div
      className={`group flex items-center justify-between gap-3 rounded-xl border p-4 transition ${
        blocked
          ? `${style.rowBorder} ${style.rowBg} opacity-95`
          : "border-lime-400/15 bg-[#020806] hover:border-lime-300/50 hover:bg-lime-400/[0.04]"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {company.logo ? (
          <img
            src={company.logo}
            alt=""
            className={`h-10 w-10 shrink-0 rounded-lg border object-cover ${
              blocked ? `${style.rowBorder} grayscale` : "border-lime-400/15"
            }`}
          />
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
              blocked
                ? style.avatar
                : "border-lime-400/30 bg-lime-400/10 text-lime-300"
            }`}
          >
            {blocked && StatusIcon ? <StatusIcon className="h-5 w-5" /> : initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`truncate text-sm font-semibold ${
                blocked ? "text-white/70 line-through" : "text-white"
              }`}
            >
              {company.name || "Untitled workspace"}
            </span>
            {blocked && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
              >
                {style.label}
              </span>
            )}
            {!blocked && workspace.is_active && (
              <span className="shrink-0 rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lime-300">
                Current
              </span>
            )}
            {!blocked && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  workspace.role === "admin"
                    ? "bg-amber-400/10 text-amber-300"
                    : "bg-sky-400/10 text-sky-300"
                }`}
              >
                {workspace.role === "admin" ? "Admin" : "Member"}
              </span>
            )}
          </div>
          <div
            className={`mt-0.5 truncate text-xs ${
              blocked ? "text-white/55" : "text-lime-100/45"
            }`}
          >
            {blocked
              ? workspace.block_reason || style.fallback
              : `${company.subdomain ? company.subdomain + " · " : ""}${
                  workspace.employee_id || "Member"
                }`}
          </div>
          {blocked && workspace.block_status === "suspended" &&
            company.suspended_until && (
              <div className="mt-0.5 text-[11px] text-sky-300/80">
                Suspended until {formatSuspendedUntil(company.suspended_until)}
              </div>
            )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {blocked ? (
          <button
            type="button"
            onClick={onShowNotice}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${style.button}`}
          >
            <Info className="h-3.5 w-3.5" />
            View notice
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lime-400/10 px-3 py-1.5 text-xs font-semibold text-lime-300 transition hover:bg-lime-400 hover:text-black disabled:opacity-60"
          >
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                Enter
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-lg p-1.5 text-lime-100/60 transition hover:bg-lime-400/10 hover:text-lime-200"
              aria-label="Workspace options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-lime-400/20 bg-[#020806] text-lime-100"
          >
            {!blocked && (
              <DropdownMenuItem
                onClick={onSetDefault}
                className="cursor-pointer focus:bg-lime-400/10 focus:text-lime-200"
              >
                <Pin className="mr-2 h-4 w-4" />
                Set as default
              </DropdownMenuItem>
            )}
            {blocked && (
              <DropdownMenuItem
                onClick={onShowNotice}
                className="cursor-pointer focus:bg-rose-500/10 focus:text-rose-200"
              >
                <Info className="mr-2 h-4 w-4" />
                View notice
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onLeave}
              className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              {/* For blocked/deleted workspaces "Leave" effectively just
                  removes the card from the user's list — the company is
                  already dead, so we relabel it for clarity. */}
              {blocked ? "Remove from list" : "Leave workspace"}
            </DropdownMenuItem>
            {/* Hide Delete on blocked workspaces — the company is already
                deleted/banned/blocked, can't re-delete it. */}
            {canDelete && !blocked && (
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete workspace
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// GitHub / Render-style destructive confirm: user must type the workspace
// name exactly to enable the delete button. Backdrop click + Escape close.
function DeleteWorkspaceModal({ workspace, onClose, onDeleted }) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset input + register Escape handler when the modal opens.
  useEffect(() => {
    if (!workspace) return;
    setTyped("");
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [workspace, onClose]);

  if (!workspace) return null;
  const company = workspace.company || {};
  const expected = String(company.name || "").trim();
  const matches =
    typed.trim().length > 0 &&
    typed.trim().toLowerCase() === expected.toLowerCase();

  const handleDelete = async () => {
    if (!matches || submitting) return;
    setSubmitting(true);
    try {
      await base44.companies.deleteWorkspace(company._id, typed.trim());
      await onDeleted?.();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not delete workspace");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      >
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/30 bg-[#0a0a0a] shadow-[0_30px_120px_rgba(244,63,94,0.25)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">
              Delete <span className="font-mono text-rose-300">{expected}</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-white/40 transition hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
              <AlertTriangle className="h-7 w-7 text-rose-400" />
            </div>

            <p className="text-center text-lg font-bold text-white break-all">
              {expected}
            </p>

            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-white/50">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {workspace.role === "admin" ? "Admin" : "Member"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {workspace.employee_id || "—"}
              </span>
            </div>

            <div className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3 text-xs text-rose-200/80">
              <p className="font-semibold text-rose-300">
                This action cannot be undone.
              </p>
              <p className="mt-1 text-rose-200/70">
                Every member will be removed from this workspace, all
                attendance records, projects, tasks, and messages will become
                inaccessible. Subdomain and custom domains will be released.
              </p>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-white">
                To confirm, type{" "}
                <span className="font-mono text-rose-300">"{expected}"</span> in
                the box below
              </label>
              <input
                autoFocus
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matches) handleDelete();
                }}
                disabled={submitting}
                className="mt-2 w-full rounded-md border border-rose-500/40 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40"
                placeholder={expected}
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!matches || submitting}
              className={`mt-4 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                matches
                  ? "bg-rose-500 text-white hover:bg-rose-400"
                  : "cursor-not-allowed border border-white/10 bg-white/5 text-white/30"
              }`}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Deleting…
                </span>
              ) : (
                "Delete this workspace"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PathCard({ icon: Icon, kicker, title, description, cta, perks, onClick, delay = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-lime-400/15 bg-[#020806] p-7 text-left shadow-[0_0_0_1px_rgba(163,230,53,0)] transition hover:border-lime-300/60 hover:bg-lime-400/[0.04] hover:shadow-[0_0_60px_rgba(163,230,53,0.08)]"
    >
      {/* Hover sheen */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-lime-400/[0.06] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      {/* Glow blob */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-lime-400/5 blur-3xl transition group-hover:bg-lime-400/15" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-lime-400/30 bg-lime-400/10 transition group-hover:scale-105 group-hover:border-lime-300/60">
            <Icon className="h-7 w-7 text-lime-300" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-100/40">
            {kicker}
          </span>
        </div>

        <div className="mt-5 text-2xl font-bold text-white">{title}</div>
        <p className="mt-2 text-sm leading-relaxed text-lime-100/55">
          {description}
        </p>

        {perks?.length > 0 && (
          <ul className="mt-5 space-y-2">
            {perks.map((perk) => (
              <li
                key={perk}
                className="flex items-start gap-2 text-xs text-lime-100/60"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400" />
                {perk}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-300 transition group-hover:bg-lime-400 group-hover:text-black">
          {cta}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-lime-100/75">{label}</Label>
      {children}
    </div>
  );
}

function UploadBox({ label, value, loading, onFile }) {
  return (
    <div className="rounded-lg border border-lime-400/15 bg-black p-4">
      <Label className="text-lime-100/75">{label}</Label>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-lime-400/15 bg-lime-400/5">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-6 w-6 text-lime-300/60" />
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-lime-400/20 px-3 py-2 text-sm text-lime-100 hover:bg-lime-400/10">
          <Upload className="mr-2 h-4 w-4" />
          {loading ? "Uploading..." : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
