import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Building2, LogIn, Upload, Users, ArrowRight, RefreshCw } from "lucide-react";
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

export default function CompanySetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUserState, refreshUser } = useAuth();
  const { refreshCompany } = useCompany();
  const inviteCode = searchParams.get("code") || "";
  const inviteToken = searchParams.get("invite") || "";
  const [mode, setMode] = useState(inviteCode ? "join" : "create");
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
            Company Setup
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white md:text-5xl">
            Set up your AttendEase workspace
          </h1>
          <p className="mt-3 text-base text-lime-100/55">
            Signed in as {user?.email}. Your company keeps employees, attendance,
            projects, messages, settings, and payroll isolated.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg border p-5 text-left transition ${
              mode === "create"
                ? "border-lime-300 bg-lime-400/10"
                : "border-lime-400/15 bg-[#020806] hover:border-lime-300/50"
            }`}
          >
            <Building2 className="mb-4 h-7 w-7 text-lime-300" />
            <div className="text-lg font-semibold">Create New Company</div>
            <p className="mt-1 text-sm text-lime-100/45">
              Become the admin and invite your team.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-lg border p-5 text-left transition ${
              mode === "join"
                ? "border-lime-300 bg-lime-400/10"
                : "border-lime-400/15 bg-[#020806] hover:border-lime-300/50"
            }`}
          >
            <Users className="mb-4 h-7 w-7 text-lime-300" />
            <div className="text-lg font-semibold">Join Existing Company</div>
            <p className="mt-1 text-sm text-lime-100/45">
              Use the invite code from your admin.
            </p>
          </button>
        </div>

        <Card className="mt-6 border-lime-400/15 bg-[#020806] text-white">
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
