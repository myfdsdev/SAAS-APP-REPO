import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Image as ImageIcon,
  Mail,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Type,
  Upload,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useCompany } from "@/lib/CompanyContext";
import { useAppSettings } from "@/lib/AppSettingsContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import CustomShifts from "@/components/admin/CustomShifts";
import SalaryRulesForm from "@/components/admin/SalaryRulesForm";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const COMPANY_SIZES = ["", "1-10", "11-50", "51-200", "200+"];

const SETTINGS_TABS = [
  {
    value: "company",
    label: "Company",
    description: "Profile, invite code, employees",
    icon: Building2,
  },
  {
    value: "app",
    label: "App Branding",
    description: "Logo, title, auto-checkout",
    icon: Type,
  },
  {
    value: "office",
    label: "Office Rules",
    description: "Hours, late rules, work days",
    icon: Clock,
  },
  {
    value: "payroll",
    label: "Shifts & Salary",
    description: "Shifts and payroll policy",
    icon: WalletCards,
  },
];

export default function CompanySettings() {
  const { company, employees, refreshCompany, refreshEmployees, setCompany } = useCompany();
  const { settings: appSettings, updateSettings: updateAppSettings } = useAppSettings();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("company");

  // ----- Company profile state -----
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    company_size: "",
    logo: "",
    favicon: "",
    address: "",
    phone: "",
    website: "",
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingCompany, setUploadingCompany] = useState("");

  // ----- Invites / employees state -----
  const [inviteEmail, setInviteEmail] = useState("");
  const [employeeIds, setEmployeeIds] = useState({});

  // ----- App settings state -----
  const defaultAppForm = {
    app_name: "",
    app_logo: "",
    html_title: "",
    favicon: "",
    primary_color: "#6366F1",
    auto_checkout_enabled: true,
    auto_checkout_hours: 2,
    auto_checkout_warning_minutes: 20,
  };
  const [appForm, setAppForm] = useState(defaultAppForm);
  const [originalAppForm, setOriginalAppForm] = useState(defaultAppForm);
  const [uploadingApp, setUploadingApp] = useState("");
  const [savingApp, setSavingApp] = useState(false);

  // ----- Office settings state -----
  const [office, setOffice] = useState({
    office_start_time: "09:00",
    office_end_time: "18:00",
    late_threshold_minutes: 15,
    half_day_hours: 4,
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  });
  const [savingOffice, setSavingOffice] = useState(false);

  // ----- Salary rules state (passed to SalaryRulesForm) -----
  const [salaryAppSettings, setSalaryAppSettings] = useState(null);

  // -------- Effects --------
  useEffect(() => {
    let alive = true;
    base44.auth
      .me()
      .then((data) => {
        if (!alive) return;
        setUser(data);
        if (data) {
          setOffice({
            office_start_time: data.office_start_time || "09:00",
            office_end_time: data.office_end_time || "18:00",
            late_threshold_minutes: data.late_threshold_minutes ?? 15,
            half_day_hours: data.half_day_hours ?? 4,
            working_days: data.working_days || [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
          });
        }
      })
      .finally(() => alive && setLoading(false));

    base44.appSettings
      .get()
      .then((s) => alive && setSalaryAppSettings(s))
      .catch(() => {});

    refreshCompany();
    refreshEmployees();

    return () => {
      alive = false;
    };
  }, [refreshCompany, refreshEmployees]);

  useEffect(() => {
    if (!company) return;
    setCompanyForm({
      name: company.name || company.company_name || "",
      industry: company.industry || "",
      company_size: company.company_size || "",
      logo: company.logo || "",
      favicon: company.favicon || "",
      address: company.address || "",
      phone: company.phone || "",
      website: company.website || "",
    });
  }, [company]);

  useEffect(() => {
    setEmployeeIds(
      Object.fromEntries(
        employees.map((e) => [e.id || e._id, e.employee_id || ""]),
      ),
    );
  }, [employees]);

  useEffect(() => {
    const next = {
      app_name: appSettings?.app_name || "AttendEase",
      app_logo: appSettings?.app_logo || "",
      html_title: appSettings?.html_title || "AttendEase",
      favicon: appSettings?.favicon || "",
      primary_color: appSettings?.primary_color || "#6366F1",
      auto_checkout_enabled: appSettings?.auto_checkout_enabled ?? true,
      auto_checkout_hours: appSettings?.auto_checkout_hours ?? 2,
      auto_checkout_warning_minutes: appSettings?.auto_checkout_warning_minutes ?? 20,
    };
    setAppForm(next);
    setOriginalAppForm(next);
  }, [appSettings]);

  const appDirty = useMemo(
    () => JSON.stringify(appForm) !== JSON.stringify(originalAppForm),
    [appForm, originalAppForm],
  );

  // -------- Handlers: Company --------
  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      const updated = await base44.companies.update(companyForm);
      setCompany(updated);
      window.dispatchEvent(new Event("app-settings-refresh"));
      toast.success("Company updated");
    } catch (e) {
      toast.error(e?.error || e?.message || "Could not update company");
    } finally {
      setSavingCompany(false);
    }
  };

  const uploadCompanyImage = async (field, file) => {
    if (!file) return;
    setUploadingCompany(field);
    try {
      const result = await base44.integrations.Core.UploadFile({
        file,
        folder: field === "favicon" ? "company-favicons" : "company-logos",
      });
      setCompanyForm((prev) => ({ ...prev, [field]: result.file_url || result.url }));
      toast.success("Upload complete");
    } catch (e) {
      toast.error(e?.error || e?.message || "Upload failed");
    } finally {
      setUploadingCompany("");
    }
  };

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(company?.invite_code || "");
    toast.success("Invite code copied");
  };

  const regenerateCode = async () => {
    try {
      const result = await base44.companies.regenerateCode();
      setCompany(result.company);
      toast.success("Invite code regenerated");
    } catch (e) {
      toast.error(e?.error || e?.message || "Could not regenerate code");
    }
  };

  const sendInvite = async (event) => {
    event.preventDefault();
    if (!inviteEmail) return;
    try {
      await base44.companies.inviteByEmail(inviteEmail);
      setInviteEmail("");
      toast.success("Invite sent");
    } catch (e) {
      toast.error(e?.error || e?.message || "Could not send invite");
    }
  };

  const updateEmployeeId = async (id) => {
    const nextId = employeeIds[id]?.trim().toUpperCase();
    if (!nextId) {
      toast.error("Employee ID is required");
      return;
    }
    try {
      await base44.companies.employees.updateEmployeeId(id, nextId);
      await refreshEmployees();
      toast.success("Employee ID updated");
    } catch (e) {
      toast.error(e?.error || e?.message || "Could not update employee ID");
    }
  };

  // -------- Handlers: App settings --------
  const handleAppImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB)");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      e.target.value = "";
      return;
    }

    setUploadingApp(field);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = result?.file_url || result?.url || result?.secure_url;
      if (!fileUrl) {
        toast.error("Upload returned no URL");
        return;
      }
      setAppForm((prev) => ({ ...prev, [field]: fileUrl }));
      toast.success(`${field === "app_logo" ? "Logo" : "Favicon"} uploaded - click Save to apply`);
    } catch (err) {
      toast.error("Failed to upload");
    } finally {
      setUploadingApp("");
      e.target.value = "";
    }
  };

  const saveApp = async () => {
    setSavingApp(true);
    try {
      await updateAppSettings({ ...appForm });
      setOriginalAppForm(appForm);
      toast.success("App settings saved");
    } catch (err) {
      toast.error(
        "Failed to save: " +
          (err?.response?.data?.error || err?.message || "Unknown error"),
      );
    } finally {
      setSavingApp(false);
    }
  };

  const resetApp = () => {
    setAppForm(originalAppForm);
    toast("Reset to last saved");
  };

  // -------- Handlers: Office --------
  const saveOffice = async () => {
    setSavingOffice(true);
    try {
      await base44.auth.updateMe({
        office_start_time: office.office_start_time,
        office_end_time: office.office_end_time,
        late_threshold_minutes: office.late_threshold_minutes,
        half_day_hours: office.half_day_hours,
        working_days: office.working_days,
      });
      toast.success("Office settings saved");
    } catch (e) {
      toast.error("Failed to save: " + (e?.message || "Unknown error"));
    } finally {
      setSavingOffice(false);
    }
  };

  const toggleWorkingDay = (day) => {
    const lower = day.toLowerCase();
    setOffice((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(lower)
        ? prev.working_days.filter((d) => d !== lower)
        : [...prev.working_days, lower],
    }));
  };

  // -------- Render guards --------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-lime-100/35">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-rose-500" />
          <h2 className="mb-2 text-2xl font-bold text-white">Access Denied</h2>
          <p className="text-lime-100/50">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  // -------- Render --------
  return (
    <div className="min-h-screen bg-black p-4 text-white md:p-6 xl:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-[1500px] space-y-6"
      >
        <header className="overflow-hidden rounded-[1.75rem] border border-lime-400/15 bg-[#020806] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-400/15 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-lime-300">
                <Shield className="h-3.5 w-3.5" />
                Admin Control Center
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Workspace Settings</h1>
              <p className="mt-2 max-w-3xl text-sm text-lime-100/55">
                Manage company profile, app branding, attendance rules, shifts, salary policy, employees, and invites from one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <Metric label="Employees" value={String(employees.length)} icon={Users} />
              <Metric label="Plan" value={company?.plan || "free"} icon={WalletCards} />
              <Metric label="Status" value={company?.status || "active"} icon={CheckCircle2} />
              <Metric label="Invite" value={company?.invite_code || "-"} icon={UserPlus} />
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden rounded-[1.75rem] border-lime-400/15 bg-[#020806] text-white">
              <CardHeader className="border-b border-lime-400/15">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5 text-lime-300" />
                  Settings Menu
                </CardTitle>
                <CardDescription>All admin settings are unified here.</CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0">
                  {SETTINGS_TABS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className="h-auto justify-start rounded-2xl border border-transparent px-4 py-3 text-left text-lime-100/65 data-[state=active]:border-lime-400/20 data-[state=active]:bg-lime-400/10 data-[state=active]:text-lime-200"
                      >
                        <Icon className="mr-3 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          <span className="mt-0.5 block truncate text-xs font-normal opacity-65">
                            {item.description}
                          </span>
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </CardContent>
            </Card>
          </aside>

          <div className="min-w-0 space-y-6">

          {/* ============ COMPANY TAB ============ */}
          <TabsContent value="company" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-lime-400/15 bg-[#020806] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-lime-300" />
                    Brand and Profile
                  </CardTitle>
                  <CardDescription>Public-facing company identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Company Name">
                      <Input
                        value={companyForm.name}
                        onChange={(e) =>
                          setCompanyForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="border-lime-400/15 bg-black"
                      />
                    </Field>
                    <Field label="Industry">
                      <Input
                        value={companyForm.industry}
                        onChange={(e) =>
                          setCompanyForm((p) => ({ ...p, industry: e.target.value }))
                        }
                        className="border-lime-400/15 bg-black"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Company Size">
                      <select
                        value={companyForm.company_size}
                        onChange={(e) =>
                          setCompanyForm((p) => ({ ...p, company_size: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-lime-400/15 bg-black px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-1 focus:ring-lime-400/40"
                      >
                        {COMPANY_SIZES.map((size) => (
                          <option key={size || "empty"} value={size}>
                            {size || "Select size"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Website">
                      <Input
                        value={companyForm.website}
                        onChange={(e) =>
                          setCompanyForm((p) => ({ ...p, website: e.target.value }))
                        }
                        className="border-lime-400/15 bg-black"
                        placeholder="https://company.com"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Phone">
                      <Input
                        value={companyForm.phone}
                        onChange={(e) =>
                          setCompanyForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="border-lime-400/15 bg-black"
                        placeholder="+91..."
                      />
                    </Field>
                    <Field label="Address">
                      <Input
                        value={companyForm.address}
                        onChange={(e) =>
                          setCompanyForm((p) => ({ ...p, address: e.target.value }))
                        }
                        className="border-lime-400/15 bg-black"
                        placeholder="Office address"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <UploadRow
                      label="Logo"
                      value={companyForm.logo}
                      loading={uploadingCompany === "logo"}
                      onFile={(f) => uploadCompanyImage("logo", f)}
                    />
                    <UploadRow
                      label="Favicon"
                      value={companyForm.favicon}
                      loading={uploadingCompany === "favicon"}
                      onFile={(f) => uploadCompanyImage("favicon", f)}
                    />
                  </div>

                  <Button
                    onClick={saveCompany}
                    disabled={savingCompany || Boolean(uploadingCompany)}
                    className="bg-lime-400 text-black hover:bg-lime-300"
                  >
                    {savingCompany ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Company
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-lime-400/15 bg-[#020806] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-lime-300" />
                    Invites
                  </CardTitle>
                  <CardDescription>Invite teammates to your workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-lg border border-lime-400/15 bg-black p-4">
                    <Label className="text-lime-100/65">Invite Code</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={company?.invite_code || ""}
                        readOnly
                        className="border-lime-400/15 bg-[#020806] font-semibold tracking-[0.22em]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyInviteCode}
                        className="border-lime-400/20 bg-transparent"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={regenerateCode}
                        className="border-lime-400/20 bg-transparent"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={sendInvite} className="space-y-3">
                    <Field label="Invite by Email">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="border-lime-400/15 bg-black"
                        placeholder="teammate@company.com"
                      />
                    </Field>
                    <Button type="submit" className="bg-lime-400 text-black hover:bg-lime-300">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invite
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Card className="border-lime-400/15 bg-[#020806] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-lime-300" />
                  Employees
                </CardTitle>
                <CardDescription>Assign and update employee IDs.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-lime-400/15">
                      <TableHead className="text-lime-100/60">Name</TableHead>
                      <TableHead className="text-lime-100/60">Email</TableHead>
                      <TableHead className="text-lime-100/60">Role</TableHead>
                      <TableHead className="text-lime-100/60">Employee ID</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const id = employee.id || employee._id;
                      return (
                        <TableRow key={id} className="border-lime-400/10">
                          <TableCell className="font-medium text-white">
                            {employee.full_name}
                          </TableCell>
                          <TableCell className="text-lime-100/55">{employee.email}</TableCell>
                          <TableCell className="capitalize text-lime-100/55">
                            {employee.role}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={employeeIds[id] || ""}
                              onChange={(e) =>
                                setEmployeeIds((prev) => ({
                                  ...prev,
                                  [id]: e.target.value.toUpperCase(),
                                }))
                              }
                              className="w-36 border-lime-400/15 bg-black"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateEmployeeId(id)}
                              className="border-lime-400/20 bg-transparent"
                            >
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ APP BRANDING TAB ============ */}
          <TabsContent value="app" className="space-y-6">
            <Card className="border-lime-400/10 bg-[#020806]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-lime-400" />
                  App Identity
                </CardTitle>
                <CardDescription>Customize how the app appears to users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>App Name</Label>
                  <Input
                    value={appForm.app_name}
                    onChange={(e) => setAppForm({ ...appForm, app_name: e.target.value })}
                    placeholder="e.g. AttendEase"
                    className="border border-lime-400/10"
                  />
                  <p className="text-xs text-lime-100/45">
                    Shown in the sidebar and login page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Browser Tab Title</Label>
                  <Input
                    value={appForm.html_title}
                    onChange={(e) => setAppForm({ ...appForm, html_title: e.target.value })}
                    placeholder="e.g. AttendEase - Workforce Management"
                    className="border border-lime-400/10"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-lime-400/10 bg-[#020806]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-lime-400" />
                    App Logo
                  </CardTitle>
                  <CardDescription>Sidebar logo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-5 rounded-2xl border border-lime-400/10 bg-black/60 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lime-100/45">
                      Brand Preview
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-lime-400 shadow-[0_0_24px_rgba(163,211,18,0.22)]">
                        {appForm.app_logo ? (
                          <img
                            src={appForm.app_logo}
                            alt="Logo preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-black" />
                        )}
                      </div>
                      <span className="text-2xl font-bold text-white">
                        {appForm.app_name || "AttendEase"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 rounded-xl border-2 border-lime-400/10">
                      {appForm.app_logo ? (
                        <AvatarImage
                          src={appForm.app_logo}
                          alt="Logo"
                          className="object-contain"
                        />
                      ) : (
                        <AvatarFallback className="rounded-xl bg-black text-lime-400">
                          <ImageIcon className="h-8 w-8" />
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAppImageUpload(e, "app_logo")}
                        className="hidden"
                        id="app-logo-upload"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingApp === "app_logo"}
                          onClick={() =>
                            document.getElementById("app-logo-upload")?.click()
                          }
                          className="bg-black"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingApp === "app_logo"
                            ? "Uploading..."
                            : appForm.app_logo
                            ? "Change Logo"
                            : "Upload Logo"}
                        </Button>
                        {appForm.app_logo && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setAppForm({ ...appForm, app_logo: "" })}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-lime-100/45">
                        Square image, max 2MB. Transparent PNG works best.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-lime-400/10 bg-[#020806]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-lime-400" />
                    Browser Favicon
                  </CardTitle>
                  <CardDescription>Tab icon.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-lime-400/10 bg-black">
                      {appForm.favicon ? (
                        <img
                          src={appForm.favicon}
                          alt="Favicon"
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-lime-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAppImageUpload(e, "favicon")}
                        className="hidden"
                        id="favicon-upload"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingApp === "favicon"}
                          onClick={() =>
                            document.getElementById("favicon-upload")?.click()
                          }
                          className="bg-black"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingApp === "favicon"
                            ? "Uploading..."
                            : appForm.favicon
                            ? "Change Favicon"
                            : "Upload Favicon"}
                        </Button>
                        {appForm.favicon && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setAppForm({ ...appForm, favicon: "" })}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-lime-100/45">32x32 or 64x64, max 2MB.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-lime-400/10 bg-[#020806]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-lime-400" />
                  Auto-Checkout Control
                </CardTitle>
                <CardDescription>
                  Automatically check out inactive employees.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!appForm.auto_checkout_enabled}
                    onChange={(e) =>
                      setAppForm({ ...appForm, auto_checkout_enabled: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 accent-lime-400"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-lime-100">Enable Auto-Checkout</div>
                    <div className="text-xs text-lime-100/50">
                      Inactive users are checked out from their last detected activity.
                    </div>
                  </div>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Inactive Hours Before Checkout</Label>
                    <Input
                      type="number"
                      min={0.25}
                      max={24}
                      step={0.25}
                      value={appForm.auto_checkout_hours}
                      disabled={!appForm.auto_checkout_enabled}
                      onChange={(e) =>
                        setAppForm({
                          ...appForm,
                          auto_checkout_hours: Number(e.target.value) || 2,
                        })
                      }
                      className="border border-lime-400/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warning Before Checkout (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={appForm.auto_checkout_warning_minutes}
                      disabled={!appForm.auto_checkout_enabled}
                      onChange={(e) =>
                        setAppForm({
                          ...appForm,
                          auto_checkout_warning_minutes: Number(e.target.value) || 20,
                        })
                      }
                      className="border border-lime-400/10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              {appDirty && (
                <Button
                  variant="outline"
                  onClick={resetApp}
                  disabled={savingApp}
                  className="bg-transparent"
                >
                  Reset Changes
                </Button>
              )}
              <Button
                onClick={saveApp}
                disabled={savingApp || !appDirty}
                size="lg"
                className="bg-lime-400 text-black hover:bg-lime-300"
              >
                <Save className="mr-2 h-5 w-5" />
                {savingApp ? "Saving..." : appDirty ? "Save App Settings" : "No Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* ============ OFFICE RULES TAB ============ */}
          <TabsContent value="office" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-lime-300" />
                    Office Hours
                  </CardTitle>
                  <CardDescription>Standard working hours.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={office.office_start_time}
                        onChange={(e) =>
                          setOffice({ ...office, office_start_time: e.target.value })
                        }
                        className="border border-lime-400/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={office.office_end_time}
                        onChange={(e) =>
                          setOffice({ ...office, office_end_time: e.target.value })
                        }
                        className="border border-lime-400/10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-lime-300" />
                    Attendance Rules
                  </CardTitle>
                  <CardDescription>Late and half-day thresholds.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Late Threshold (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={office.late_threshold_minutes}
                      onChange={(e) =>
                        setOffice({
                          ...office,
                          late_threshold_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="border border-lime-400/10"
                    />
                    <p className="text-xs text-lime-100/50">
                      Check-ins after this delay are marked late.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Half Day Hours</Label>
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      step="0.5"
                      value={office.half_day_hours}
                      onChange={(e) =>
                        setOffice({
                          ...office,
                          half_day_hours: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="border border-lime-400/10"
                    />
                    <p className="text-xs text-lime-100/50">
                      Working less than this is half-day.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-lime-300" />
                  Working Days
                </CardTitle>
                <CardDescription>Select which days are working days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                  {WEEKDAYS.map((day) => {
                    const isSelected = office.working_days.includes(day.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleWorkingDay(day)}
                        className={`rounded-lg border-2 p-3 transition-all ${
                          isSelected
                            ? "border-lime-400 bg-lime-400/10 font-semibold text-lime-300"
                            : "border-lime-400/15 text-lime-100/65 hover:border-lime-400/30"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={saveOffice}
                disabled={savingOffice}
                size="lg"
                className="bg-lime-400 text-black hover:bg-lime-300"
              >
                <Save className="mr-2 h-5 w-5" />
                {savingOffice ? "Saving..." : "Save Office Settings"}
              </Button>
            </div>
          </TabsContent>

          {/* ============ SHIFTS & SALARY TAB ============ */}
          <TabsContent value="payroll" className="space-y-6">
            <SalaryRulesForm
              appSettings={salaryAppSettings}
              onSuccess={() => base44.appSettings.get().then(setSalaryAppSettings)}
            />
            <CustomShifts />
          </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </div>
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

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-lime-400/15 bg-black/55 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-100/45">
          {label}
        </span>
        <Icon className="h-4 w-4 text-lime-300" />
      </div>
      <p className="truncate text-sm font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function UploadRow({ label, value, loading, onFile }) {
  return (
    <div className="rounded-lg border border-lime-400/15 bg-black p-4">
      <Label className="text-lime-100/75">{label}</Label>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-lime-400/15 bg-lime-400/5">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-6 w-6 text-lime-300/55" />
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
