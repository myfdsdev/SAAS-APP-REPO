import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Building2,
  ChevronDown,
  Clock,
  LayoutDashboard,
  Lock,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =====================================================================
// CONSTANTS
// =====================================================================

const PAGE_SIZE = 10;

const statusStyles = {
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  blocked: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  banned: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  suspended: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  deleted: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200",
};

const roleStyles = {
  super_admin: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-100",
  admin: "border-lime-300/35 bg-lime-400/10 text-lime-100",
  user: "border-lime-100/20 bg-white/5 text-lime-100/70",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const getId = (row) => row.id || row._id;

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export default function SuperAdmin() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [companySearch, setCompanySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [companySort, setCompanySort] = useState("name_asc"); // name_asc | name_desc | created_desc
  const [userSort, setUserSort] = useState("name_asc");

  const [companyVisible, setCompanyVisible] = useState(PAGE_SIZE);
  const [userVisible, setUserVisible] = useState(PAGE_SIZE);

  const [saving, setSaving] = useState("");

  // Single source of truth for any modal — null means no modal open.
  // Shape: { type: "moderation" | "confirm", target: row, action: "block"|"ban"|... }
  const [modal, setModal] = useState(null);

  const summary = useMemo(() => {
    const activeCompanies = companies.filter((c) => c.status === "active").length;
    const restrictedCompanies = companies.filter((c) => c.status && c.status !== "active").length;
    const superAdmins = users.filter((u) => u.role === "super_admin").length;
    return {
      companies: companies.length,
      activeCompanies,
      restrictedCompanies,
      users: users.length,
      superAdmins,
    };
  }, [companies, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        base44.superAdmin.companies.list({}),
        base44.superAdmin.users.list({}),
      ]);
      setCompanies(cRes.companies || []);
      setUsers(uRes.users || []);
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset visible count when search/sort changes so user sees the top of new results.
  useEffect(() => setCompanyVisible(PAGE_SIZE), [companySearch, companySort]);
  useEffect(() => setUserVisible(PAGE_SIZE), [userSearch, userSort]);

  // ---------- Filter + sort ----------

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    let list = companies;
    if (q) {
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.invite_code?.toLowerCase().includes(q) ||
          c.subdomain?.toLowerCase().includes(q) ||
          c.owner_email?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (companySort === "name_desc")
        return (b.name || "").localeCompare(a.name || "");
      if (companySort === "created_desc")
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return (a.name || "").localeCompare(b.name || ""); // default: name_asc
    });
  }, [companies, companySearch, companySort]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    let list = users;
    if (q) {
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.company_id?.name?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (userSort === "name_desc")
        return (b.full_name || "").localeCompare(a.full_name || "");
      if (userSort === "created_desc")
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return (a.full_name || "").localeCompare(b.full_name || "");
    });
  }, [users, userSearch, userSort]);

  const visibleCompanies = filteredCompanies.slice(0, companyVisible);
  const visibleUsers = filteredUsers.slice(0, userVisible);

  // ---------- Actions ----------

  const submitCompanyStatus = async (company, status, { reason = "", duration_hours } = {}) => {
    const id = getId(company);
    setSaving(`company-${id}-${status}`);
    try {
      if (status === "deleted") {
        await base44.superAdmin.companies.remove(id, reason);
      } else {
        const payload = { status, reason };
        if (status === "suspended") payload.duration_hours = duration_hours;
        await base44.superAdmin.companies.setStatus(id, payload);
      }
      toast.success(`Company ${status}`);
      await loadData();
    } catch (err) {
      toast.error(err?.error || err?.message || "Update failed");
    } finally {
      setSaving("");
    }
  };

  const submitUserAccess = async (user, status, { reason = "", duration_hours } = {}) => {
    const id = getId(user);
    setSaving(`user-${id}-${status}`);
    try {
      const payload = { status, reason };
      if (status === "suspended") payload.duration_hours = duration_hours;
      await base44.superAdmin.users.setAccess(id, payload);
      toast.success(`User ${status}`);
      await loadData();
    } catch (err) {
      toast.error(err?.error || err?.message || "Update failed");
    } finally {
      setSaving("");
    }
  };

  const submitRoleChange = async (user, role) => {
    const id = getId(user);
    setSaving(`role-${id}-${role}`);
    try {
      await base44.superAdmin.users.setRole(id, role);
      toast.success("Role updated");
      await loadData();
    } catch (err) {
      toast.error(err?.error || err?.message || "Role update failed");
    } finally {
      setSaving("");
    }
  };

  // Open the moderation modal for a given action.
  const openModeration = (kind, target, action) => {
    setModal({ kind, target, action });
  };

  // Called by the modal once user has filled in reason/hours and confirms.
  const handleModeration = async ({ reason, duration_hours }) => {
    if (!modal) return;
    const { kind, target, action } = modal;
    setModal(null);
    if (kind === "company") {
      await submitCompanyStatus(target, action, { reason, duration_hours });
    } else if (kind === "user_access") {
      await submitUserAccess(target, action, { reason, duration_hours });
    } else if (kind === "user_role") {
      await submitRoleChange(target, action);
    }
  };

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <div className="min-h-screen bg-black p-4 text-white md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
              Super Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Platform Control</h1>
            <p className="mt-2 text-sm text-lime-100/50">
              Manage every company, account access, and super admin promotion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/CompanySetup")}
              className="border-lime-400/30 bg-transparent text-lime-200 hover:bg-lime-400/10 hover:text-lime-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit Super Admin
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/AdminDashboard")}
              className="border-lime-400/30 bg-transparent text-lime-200 hover:bg-lime-400/10 hover:text-lime-100"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              My Workspace
            </Button>
            <Button onClick={loadData} disabled={loading} className="bg-lime-400 text-black hover:bg-lime-300">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-5">
          <Metric title="Companies" value={summary.companies} icon={Building2} />
          <Metric title="Active" value={summary.activeCompanies} icon={Unlock} />
          <Metric title="Restricted" value={summary.restrictedCompanies} icon={Lock} />
          <Metric title="Users" value={summary.users} icon={Users} />
          <Metric title="Super Admins" value={summary.superAdmins} icon={ShieldCheck} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="companies" className="space-y-5">
          <TabsList className="border border-lime-400/15 bg-[#020806]">
            <TabsTrigger value="companies">
              <Building2 className="mr-2 h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* ---------------- COMPANIES TAB ---------------- */}
          <TabsContent value="companies">
            <Card className="border-lime-400/15 bg-[#020806] text-white">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Companies</CardTitle>
                  <div className="flex flex-1 flex-col gap-2 md:max-w-2xl md:flex-row md:items-center">
                    <SearchInput
                      value={companySearch}
                      onChange={setCompanySearch}
                      placeholder="Search by name, code, subdomain, owner…"
                    />
                    <SortDropdown value={companySort} onChange={setCompanySort} />
                  </div>
                </div>
                <ResultMeta
                  visible={visibleCompanies.length}
                  total={filteredCompanies.length}
                  unfiltered={companies.length}
                />
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-lime-400/15">
                      <TableHead className="text-lime-100/60">Company</TableHead>
                      <TableHead className="text-lime-100/60">Owner</TableHead>
                      <TableHead className="text-lime-100/60">Status</TableHead>
                      <TableHead className="text-lime-100/60">Users</TableHead>
                      <TableHead className="text-lime-100/60">Suspended Until</TableHead>
                      <TableHead className="w-[80px] text-right text-lime-100/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCompanies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-lime-100/40">
                          {companySearch ? "No companies match your search" : "No companies yet"}
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleCompanies.map((company) => (
                      <TableRow key={getId(company)} className="border-lime-400/10">
                        <TableCell>
                          <div className="font-medium text-white">{company.name}</div>
                          <div className="text-xs text-lime-100/40">
                            {company.subdomain ? `${company.subdomain} · ` : ""}
                            {company.invite_code}
                          </div>
                        </TableCell>
                        <TableCell className="text-lime-100/55">{company.owner_email || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge value={company.status || "active"} />
                        </TableCell>
                        <TableCell className="text-lime-100/55">
                          {company.total_users || 0} total · {company.admins || 0} admins
                        </TableCell>
                        <TableCell className="text-lime-100/55">
                          {formatDate(company.suspended_until)}
                        </TableCell>
                        <TableCell className="text-right">
                          <CompanyActionsMenu
                            company={company}
                            saving={saving}
                            onAction={(action) =>
                              action === "active"
                                ? submitCompanyStatus(company, "active")
                                : openModeration("company", company, action)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {filteredCompanies.length > companyVisible && (
                <SeeMoreFooter
                  remaining={filteredCompanies.length - companyVisible}
                  onClick={() =>
                    setCompanyVisible((v) =>
                      Math.min(v + PAGE_SIZE, filteredCompanies.length),
                    )
                  }
                />
              )}
            </Card>
          </TabsContent>

          {/* ---------------- USERS TAB ---------------- */}
          <TabsContent value="users">
            <Card className="border-lime-400/15 bg-[#020806] text-white">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Users</CardTitle>
                  <div className="flex flex-1 flex-col gap-2 md:max-w-2xl md:flex-row md:items-center">
                    <SearchInput
                      value={userSearch}
                      onChange={setUserSearch}
                      placeholder="Search users by name, email, company…"
                    />
                    <SortDropdown value={userSort} onChange={setUserSort} />
                  </div>
                </div>
                <ResultMeta
                  visible={visibleUsers.length}
                  total={filteredUsers.length}
                  unfiltered={users.length}
                />
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-lime-400/15">
                      <TableHead className="text-lime-100/60">User</TableHead>
                      <TableHead className="text-lime-100/60">Company</TableHead>
                      <TableHead className="text-lime-100/60">Role</TableHead>
                      <TableHead className="text-lime-100/60">Access</TableHead>
                      <TableHead className="text-lime-100/60">Suspended Until</TableHead>
                      <TableHead className="w-[80px] text-right text-lime-100/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-lime-100/40">
                          {userSearch ? "No users match your search" : "No users yet"}
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleUsers.map((user) => (
                      <TableRow key={getId(user)} className="border-lime-400/10">
                        <TableCell>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-xs text-lime-100/40">{user.email}</div>
                        </TableCell>
                        <TableCell className="text-lime-100/55">
                          {user.company_id?.name || "Platform"}
                        </TableCell>
                        <TableCell>
                          <Badge className={roleStyles[user.role] || roleStyles.user}>
                            {user.role?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            value={
                              user.is_active === false
                                ? "blocked"
                                : user.access_status || "active"
                            }
                          />
                        </TableCell>
                        <TableCell className="text-lime-100/55">
                          {formatDate(user.suspended_until)}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActionsMenu
                            user={user}
                            saving={saving}
                            onRoleChange={(role) =>
                              setModal({
                                kind: "user_role",
                                target: user,
                                action: role,
                              })
                            }
                            onAccess={(action) =>
                              action === "active"
                                ? submitUserAccess(user, "active")
                                : openModeration("user_access", user, action)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {filteredUsers.length > userVisible && (
                <SeeMoreFooter
                  remaining={filteredUsers.length - userVisible}
                  onClick={() =>
                    setUserVisible((v) => Math.min(v + PAGE_SIZE, filteredUsers.length))
                  }
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Shared modal — handles moderation reasons & role-change confirms */}
      <ModerationModal
        modal={modal}
        onClose={() => setModal(null)}
        onConfirm={handleModeration}
      />
    </div>
  );
}

// =====================================================================
// SUBCOMPONENTS
// =====================================================================

function Metric({ title, value, icon: Icon }) {
  return (
    <Card className="border-lime-400/15 bg-[#020806] text-white">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-lime-100/40">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-6 w-6 text-lime-300" />
      </CardContent>
    </Card>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-lime-100/35" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-lime-400/15 bg-black pl-9 pr-9 text-white placeholder:text-white/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-2.5 text-lime-100/40 hover:text-lime-300"
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { id: "name_asc", label: "Name A → Z" },
  { id: "name_desc", label: "Name Z → A" },
  { id: "created_desc", label: "Newest first" },
];

function SortDropdown({ value, onChange }) {
  const current = SORT_OPTIONS.find((o) => o.id === value) || SORT_OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="justify-between border-lime-400/15 bg-black text-white hover:bg-lime-400/10 md:w-44"
        >
          <span className="inline-flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-lime-300" />
            {current.label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-lime-400/20 bg-[#020806] text-lime-100">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`cursor-pointer focus:bg-lime-400/10 focus:text-lime-200 ${
              opt.id === value ? "text-lime-300" : ""
            }`}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ResultMeta({ visible, total, unfiltered }) {
  return (
    <p className="text-xs text-lime-100/40">
      Showing <span className="font-semibold text-lime-200">{visible}</span> of{" "}
      <span className="font-semibold text-lime-200">{total}</span>
      {total !== unfiltered && (
        <span className="text-lime-100/30"> · {unfiltered} total</span>
      )}
    </p>
  );
}

function SeeMoreFooter({ remaining, onClick }) {
  return (
    <div className="flex justify-center border-t border-lime-400/10 px-4 py-4">
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        className="border-lime-400/25 bg-transparent text-lime-200 hover:bg-lime-400/10 hover:text-lime-100"
      >
        <Plus className="mr-2 h-4 w-4" />
        See {Math.min(PAGE_SIZE, remaining)} more
        <span className="ml-2 text-xs text-lime-100/40">
          ({remaining} remaining)
        </span>
      </Button>
    </div>
  );
}

function StatusBadge({ value }) {
  return (
    <Badge className={statusStyles[value] || statusStyles.active}>
      {String(value || "active").replace("_", " ")}
    </Badge>
  );
}

function CompanyActionsMenu({ company, saving, onAction }) {
  const id = getId(company);
  const isBusy = saving.startsWith(`company-${id}`);
  const status = company.status || "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isBusy}
          className="rounded-lg p-1.5 text-lime-100/60 transition hover:bg-lime-400/10 hover:text-lime-200 disabled:opacity-40"
          aria-label="Actions"
        >
          {isBusy ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-lime-400/20 bg-[#020806] text-lime-100">
        <DropdownMenuLabel className="text-lime-100/40">Status</DropdownMenuLabel>
        {status !== "active" && (
          <DropdownMenuItem
            onClick={() => onAction("active")}
            className="cursor-pointer text-emerald-300 focus:bg-emerald-500/10 focus:text-emerald-200"
          >
            <Unlock className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onAction("suspended")}
          className="cursor-pointer text-sky-300 focus:bg-sky-500/10 focus:text-sky-200"
        >
          <Clock className="mr-2 h-4 w-4" />
          Suspend (timed)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction("blocked")}
          className="cursor-pointer text-amber-300 focus:bg-amber-500/10 focus:text-amber-200"
        >
          <Lock className="mr-2 h-4 w-4" />
          Block
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction("banned")}
          className="cursor-pointer text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
        >
          <Ban className="mr-2 h-4 w-4" />
          Ban
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          onClick={() => onAction("deleted")}
          className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-400"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserActionsMenu({ user, saving, onRoleChange, onAccess }) {
  const id = getId(user);
  const isBusy = saving.startsWith(`user-${id}`) || saving.startsWith(`role-${id}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isBusy}
          className="rounded-lg p-1.5 text-lime-100/60 transition hover:bg-lime-400/10 hover:text-lime-200 disabled:opacity-40"
          aria-label="Actions"
        >
          {isBusy ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-lime-400/20 bg-[#020806] text-lime-100">
        <DropdownMenuLabel className="text-lime-100/40">Role</DropdownMenuLabel>
        {user.role !== "super_admin" && (
          <DropdownMenuItem
            onClick={() => onRoleChange("super_admin")}
            className="cursor-pointer text-fuchsia-300 focus:bg-fuchsia-500/10 focus:text-fuchsia-200"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Make super admin
          </DropdownMenuItem>
        )}
        {user.role !== "admin" && (
          <DropdownMenuItem
            onClick={() => onRoleChange("admin")}
            className="cursor-pointer focus:bg-lime-400/10 focus:text-lime-200"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Make admin
          </DropdownMenuItem>
        )}
        {user.role !== "user" && (
          <DropdownMenuItem
            onClick={() => onRoleChange("user")}
            className="cursor-pointer focus:bg-white/5 focus:text-white"
          >
            <Users className="mr-2 h-4 w-4" />
            Make user
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuLabel className="text-lime-100/40">Access</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onAccess("active")}
          className="cursor-pointer text-emerald-300 focus:bg-emerald-500/10 focus:text-emerald-200"
        >
          <Unlock className="mr-2 h-4 w-4" />
          Reactivate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAccess("suspended")}
          className="cursor-pointer text-sky-300 focus:bg-sky-500/10 focus:text-sky-200"
        >
          <Clock className="mr-2 h-4 w-4" />
          Suspend (timed)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAccess("blocked")}
          className="cursor-pointer text-amber-300 focus:bg-amber-500/10 focus:text-amber-200"
        >
          <Lock className="mr-2 h-4 w-4" />
          Block
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAccess("banned")}
          className="cursor-pointer text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
        >
          <Ban className="mr-2 h-4 w-4" />
          Ban
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =====================================================================
// MODERATION MODAL — replaces all native window.prompt / window.confirm
// =====================================================================

const ACTION_COPY = {
  // companies
  suspended: { title: "Suspend workspace", needsHours: true, defaultHours: 168, accent: "sky" },
  blocked: { title: "Block workspace", accent: "amber" },
  banned: { title: "Ban workspace", accent: "rose" },
  deleted: { title: "Delete workspace", accent: "red", danger: true },
  // user roles
  super_admin: { title: "Promote to super admin", accent: "fuchsia", isRole: true },
  admin: { title: "Make user an admin", accent: "lime", isRole: true },
  user: { title: "Demote to user", accent: "white", isRole: true },
};

function ModerationModal({ modal, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(168);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!modal) return;
    setReason("");
    const copy = ACTION_COPY[modal.action];
    setHours(copy?.defaultHours || 168);
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, onClose]);

  if (!modal) return null;
  const copy = ACTION_COPY[modal.action] || {};
  const targetName =
    modal.kind === "company"
      ? modal.target?.name
      : modal.target?.full_name || modal.target?.email;

  const confirm = () => {
    onConfirm({
      reason: reason.trim(),
      duration_hours: copy.needsHours ? Number(hours) : undefined,
    });
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
          className={`w-full max-w-md overflow-hidden rounded-2xl border bg-[#0a0a0a] shadow-2xl ${
            copy.danger ? "border-red-500/30" : "border-lime-400/20"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">{copy.title || "Confirm"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5 text-sm">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="text-xs text-white/40">Target</p>
              <p className="mt-1 truncate font-semibold text-white">{targetName}</p>
            </div>

            {copy.isRole ? (
              <p className="text-white/60">
                You're about to change this user's role. They'll get the new
                permissions on their next request.
              </p>
            ) : (
              <>
                {copy.needsHours && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      Duration (hours)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      ref={inputRef}
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="mt-1 border-lime-400/20 bg-black text-white"
                    />
                    <p className="mt-1 text-xs text-white/40">
                      e.g. 24 = 1 day, 168 = 1 week
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Reason {copy.danger ? "" : "(optional)"}
                  </label>
                  <textarea
                    ref={copy.needsHours ? null : inputRef}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="What should the team see? (shown in their banned-workspace notice)"
                    className="mt-1 w-full rounded-md border border-lime-400/20 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-lime-400/50 focus:outline-none"
                  />
                </div>

                {copy.danger && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200/80">
                    This is destructive. Members will lose access immediately.
                    The workspace remains soft-deleted on the platform.
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-black/40 px-5 py-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/10 bg-transparent text-white/70 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={confirm}
              className={
                copy.danger
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "bg-lime-400 text-black hover:bg-lime-300"
              }
            >
              {copy.danger ? "Delete" : "Confirm"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
