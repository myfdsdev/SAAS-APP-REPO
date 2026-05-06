import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Ban,
  Building2,
  Clock,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
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

export default function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState("");

  const summary = useMemo(() => {
    const activeCompanies = companies.filter((company) => company.status === "active").length;
    const restrictedCompanies = companies.filter((company) => company.status !== "active").length;
    const superAdmins = users.filter((user) => user.role === "super_admin").length;
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
      const [companyResult, userResult] = await Promise.all([
        base44.superAdmin.companies.list({ search: companySearch || undefined }),
        base44.superAdmin.users.list({ search: userSearch || undefined }),
      ]);
      setCompanies(companyResult.companies || []);
      setUsers(userResult.users || []);
    } catch (error) {
      toast.error(error?.error || error?.message || "Could not load super admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyStatus = async (company, status) => {
    const companyId = getId(company);
    let payload = { status };

    if (status === "suspended") {
      const hours = window.prompt("Suspend for how many hours?", "168");
      if (!hours) return;
      payload = { status, duration_hours: Number(hours), reason: window.prompt("Reason", "") || "" };
    } else if (status !== "active") {
      payload.reason = window.prompt("Reason", "") || "";
    }

    setSaving(`company-${companyId}-${status}`);
    try {
      if (status === "deleted") {
        const ok = window.confirm(`Delete ${company.name}? This is a soft delete and blocks access.`);
        if (!ok) return;
        await base44.superAdmin.companies.remove(companyId, payload.reason);
      } else {
        await base44.superAdmin.companies.setStatus(companyId, payload);
      }
      toast.success(`Company ${status}`);
      await loadData();
    } catch (error) {
      toast.error(error?.error || error?.message || "Company update failed");
    } finally {
      setSaving("");
    }
  };

  const userAccess = async (user, status) => {
    const userId = getId(user);
    let payload = { status };

    if (status === "suspended") {
      const hours = window.prompt("Suspend for how many hours?", "24");
      if (!hours) return;
      payload = { status, duration_hours: Number(hours), reason: window.prompt("Reason", "") || "" };
    } else if (status !== "active") {
      payload.reason = window.prompt("Reason", "") || "";
    }

    setSaving(`user-${userId}-${status}`);
    try {
      await base44.superAdmin.users.setAccess(userId, payload);
      toast.success(`User ${status}`);
      await loadData();
    } catch (error) {
      toast.error(error?.error || error?.message || "User update failed");
    } finally {
      setSaving("");
    }
  };

  const setRole = async (user, role) => {
    const userId = getId(user);
    const ok = window.confirm(`Change ${user.email} to ${role.replace("_", " ")}?`);
    if (!ok) return;

    setSaving(`role-${userId}-${role}`);
    try {
      await base44.superAdmin.users.setRole(userId, role);
      toast.success("Role updated");
      await loadData();
    } catch (error) {
      toast.error(error?.error || error?.message || "Role update failed");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 text-white md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl space-y-6"
      >
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
          <Button onClick={loadData} disabled={loading} className="bg-lime-400 text-black hover:bg-lime-300">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Metric title="Companies" value={summary.companies} icon={Building2} />
          <Metric title="Active" value={summary.activeCompanies} icon={Unlock} />
          <Metric title="Restricted" value={summary.restrictedCompanies} icon={Lock} />
          <Metric title="Users" value={summary.users} icon={Users} />
          <Metric title="Super Admins" value={summary.superAdmins} icon={ShieldCheck} />
        </div>

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

          <TabsContent value="companies">
            <Card className="border-lime-400/15 bg-[#020806] text-white">
              <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Companies</CardTitle>
                <SearchBox
                  value={companySearch}
                  onChange={setCompanySearch}
                  onSearch={loadData}
                  placeholder="Search companies"
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
                      <TableHead className="text-right text-lime-100/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={getId(company)} className="border-lime-400/10">
                        <TableCell>
                          <div className="font-medium text-white">{company.name}</div>
                          <div className="text-xs text-lime-100/40">{company.invite_code}</div>
                        </TableCell>
                        <TableCell className="text-lime-100/55">{company.owner_email || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge value={company.status || "active"} />
                        </TableCell>
                        <TableCell className="text-lime-100/55">
                          {company.total_users || 0} total, {company.admins || 0} admins
                        </TableCell>
                        <TableCell className="text-lime-100/55">{formatDate(company.suspended_until)}</TableCell>
                        <TableCell className="min-w-[420px] text-right">
                          <ActionRow
                            busyPrefix={`company-${getId(company)}`}
                            saving={saving}
                            onActive={() => companyStatus(company, "active")}
                            onBlock={() => companyStatus(company, "blocked")}
                            onBan={() => companyStatus(company, "banned")}
                            onSuspend={() => companyStatus(company, "suspended")}
                            onDelete={() => companyStatus(company, "deleted")}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-lime-400/15 bg-[#020806] text-white">
              <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Users</CardTitle>
                <SearchBox
                  value={userSearch}
                  onChange={setUserSearch}
                  onSearch={loadData}
                  placeholder="Search users"
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
                      <TableHead className="text-right text-lime-100/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={getId(user)} className="border-lime-400/10">
                        <TableCell>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-xs text-lime-100/40">{user.email}</div>
                        </TableCell>
                        <TableCell className="text-lime-100/55">{user.company_id?.name || "Platform"}</TableCell>
                        <TableCell>
                          <Badge className={roleStyles[user.role] || roleStyles.user}>
                            {user.role?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={user.is_active === false ? "blocked" : user.access_status || "active"} />
                        </TableCell>
                        <TableCell className="text-lime-100/55">{formatDate(user.suspended_until)}</TableCell>
                        <TableCell className="min-w-[560px] text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {user.role !== "super_admin" && (
                              <Button
                                size="sm"
                                onClick={() => setRole(user, "super_admin")}
                                disabled={saving === `role-${getId(user)}-super_admin`}
                                className="bg-fuchsia-300 text-black hover:bg-fuchsia-200"
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                Super
                              </Button>
                            )}
                            {user.role !== "admin" && user.role !== "super_admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRole(user, "admin")}
                                disabled={saving === `role-${getId(user)}-admin`}
                                className="border-lime-400/20 bg-transparent"
                              >
                                Admin
                              </Button>
                            )}
                            {user.role !== "user" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRole(user, "user")}
                                disabled={saving === `role-${getId(user)}-user`}
                                className="border-lime-400/20 bg-transparent"
                              >
                                User
                              </Button>
                            )}
                            <UserAccessRow user={user} saving={saving} onAccess={userAccess} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

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

function SearchBox({ value, onChange, onSearch, placeholder }) {
  return (
    <div className="flex w-full gap-2 md:w-80">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-lime-100/35" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
          placeholder={placeholder}
          className="border-lime-400/15 bg-black pl-9 text-white"
        />
      </div>
      <Button type="button" variant="outline" onClick={onSearch} className="border-lime-400/20 bg-transparent">
        Search
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

function ActionRow({ busyPrefix, saving, onActive, onBlock, onBan, onSuspend, onDelete }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onActive} disabled={saving.startsWith(busyPrefix)} className="border-lime-400/20 bg-transparent">
        <Unlock className="mr-1 h-3.5 w-3.5" />
        Active
      </Button>
      <Button size="sm" variant="outline" onClick={onBlock} disabled={saving.startsWith(busyPrefix)} className="border-amber-400/25 bg-transparent text-amber-200 hover:bg-amber-400/10">
        <Lock className="mr-1 h-3.5 w-3.5" />
        Block
      </Button>
      <Button size="sm" variant="outline" onClick={onBan} disabled={saving.startsWith(busyPrefix)} className="border-rose-400/25 bg-transparent text-rose-200 hover:bg-rose-400/10">
        <Ban className="mr-1 h-3.5 w-3.5" />
        Ban
      </Button>
      <Button size="sm" variant="outline" onClick={onSuspend} disabled={saving.startsWith(busyPrefix)} className="border-sky-400/25 bg-transparent text-sky-200 hover:bg-sky-400/10">
        <Clock className="mr-1 h-3.5 w-3.5" />
        Suspend
      </Button>
      <Button size="sm" variant="outline" onClick={onDelete} disabled={saving.startsWith(busyPrefix)} className="border-zinc-400/25 bg-transparent text-zinc-200 hover:bg-zinc-400/10">
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}

function UserAccessRow({ user, saving, onAccess }) {
  const busyPrefix = `user-${getId(user)}`;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => onAccess(user, "active")} disabled={saving.startsWith(busyPrefix)} className="border-lime-400/20 bg-transparent">
        Active
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAccess(user, "blocked")} disabled={saving.startsWith(busyPrefix)} className="border-amber-400/25 bg-transparent text-amber-200 hover:bg-amber-400/10">
        Block
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAccess(user, "banned")} disabled={saving.startsWith(busyPrefix)} className="border-rose-400/25 bg-transparent text-rose-200 hover:bg-rose-400/10">
        Ban
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAccess(user, "suspended")} disabled={saving.startsWith(busyPrefix)} className="border-sky-400/25 bg-transparent text-sky-200 hover:bg-sky-400/10">
        Suspend
      </Button>
    </>
  );
}
