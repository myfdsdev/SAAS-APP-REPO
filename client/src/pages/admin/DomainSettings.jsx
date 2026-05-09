import React, { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Trash2,
  Wand2,
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useCompany } from "@/lib/CompanyContext";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN || "yourapp.com";

const copy = (text) => {
  navigator.clipboard.writeText(String(text));
  toast.success("Copied!");
};

const inputClass =
  "border-lime-400/15 bg-black text-white placeholder:text-white/30";

// Strip `hr.acme.com` -> `acme.com` so we can deep-link into the customer's
// registrar with their root domain. Falls back to the input if it's already root.
const rootDomain = (host) => {
  const parts = String(host || "").split(".");
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
};

// Popular DNS providers. `dnsUrl(domain)` returns the registrar's DNS
// management page deep-link. Some providers (Cloudflare) need an account ID
// in the path that we don't know — those send the user to the dashboard root
// and let them pick the domain.
// Logos use cdn.simpleicons.org (no install, no API key) with brand-color hex.
const PROVIDERS = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    logo: "https://cdn.simpleicons.org/cloudflare/F38020",
    dnsUrl: () => "https://dash.cloudflare.com/",
    tip: "Pick your domain → DNS → Records. Make sure the proxy is OFF (gray cloud, DNS only).",
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    logo: "https://cdn.simpleicons.org/godaddy/1BDBDB",
    dnsUrl: (domain) =>
      `https://dcc.godaddy.com/manage/${rootDomain(domain)}/dns`,
    tip: "Scroll to Records → Add → CNAME / TXT. Propagation can take up to 30 min.",
  },
  {
    id: "namecheap",
    name: "Namecheap",
    logo: "https://cdn.simpleicons.org/namecheap/DE3723",
    dnsUrl: (domain) =>
      `https://ap.www.namecheap.com/Domains/DomainControlPanel/${rootDomain(
        domain,
      )}/advancedns`,
    tip: "Use the 'Advanced DNS' tab → Add New Record.",
  },
  {
    id: "hostinger",
    name: "Hostinger",
    logo: "https://cdn.simpleicons.org/hostinger/673DE6",
    dnsUrl: (domain) =>
      `https://hpanel.hostinger.com/domain/${rootDomain(domain)}/dns`,
    tip: "DNS / Nameservers → Manage DNS records.",
  },
  {
    id: "google",
    name: "Squarespace / Google",
    logo: "https://cdn.simpleicons.org/squarespace/000000",
    dnsUrl: (domain) =>
      `https://account.squarespace.com/domains/managed/${rootDomain(
        domain,
      )}/dns/dns-settings`,
    tip: "DNS Settings → Custom Records → Add.",
  },
  {
    id: "route53",
    name: "AWS Route 53",
    logo: "https://cdn.simpleicons.org/amazonaws/FF9900",
    dnsUrl: () =>
      "https://console.aws.amazon.com/route53/v2/hostedzones",
    tip: "Pick the hosted zone → Create record.",
  },
  {
    id: "vercel",
    name: "Vercel",
    logo: "https://cdn.simpleicons.org/vercel/FFFFFF",
    dnsUrl: (domain) =>
      `https://vercel.com/dashboard/domains/${rootDomain(domain)}`,
    tip: "Pick your domain → DNS Records → Add.",
  },
  {
    id: "other",
    name: "Other",
    logo: null,
    dnsUrl: null,
    tip: "Open your registrar's DNS / Nameservers page and add the records below.",
  },
];

const PROVIDER_STORAGE_KEY = "domain_settings_provider";

const ProviderPicker = ({ domain, value, onChange }) => {
  const selected = PROVIDERS.find((p) => p.id === value) || PROVIDERS[0];
  const targetUrl = selected.dnsUrl ? selected.dnsUrl(domain) : null;

  return (
    <div className="rounded-lg border border-lime-400/15 bg-black/40 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">
          Where did you buy <code className="text-lime-300">{domain}</code>?
        </p>
        <p className="text-xs text-white/50 mt-0.5">
          We'll deep-link you straight to that provider's DNS page.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PROVIDERS.map((p) => {
          const active = p.id === selected.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                active
                  ? "border-lime-400 bg-lime-400/10 text-white"
                  : "border-lime-400/15 bg-black text-white/70 hover:border-lime-400/40 hover:text-white"
              }`}
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt=""
                  className="h-4 w-4 shrink-0"
                  loading="lazy"
                />
              ) : (
                <Globe className="h-4 w-4 shrink-0 text-white/60" />
              )}
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>

      {targetUrl ? (
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-300"
        >
          <Wand2 className="h-4 w-4" />
          Auto configure on {selected.name}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      ) : (
        <div className="rounded-lg border border-dashed border-lime-400/15 px-3 py-2 text-xs text-white/60">
          Pick a provider above, or open your registrar's DNS page manually.
        </div>
      )}

      {selected.tip && (
        <p className="text-xs text-white/60">
          <span className="text-lime-300 font-medium">Tip:</span> {selected.tip}
        </p>
      )}
    </div>
  );
};

const DnsRecord = ({ record }) => (
  <div className="rounded-lg border border-lime-400/15 bg-black/60 p-4 space-y-3">
    <p className="text-sm font-semibold text-lime-300">{record.description}</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
      <Field label="Type" value={record.type} />
      <Field label="Name / Host" value={record.host || record.name} mono />
      <Field label="Value" value={record.value} mono />
    </div>
    <Button
      size="sm"
      variant="ghost"
      className="text-lime-300 hover:bg-lime-400/10 hover:text-lime-200"
      onClick={() => copy(record.value)}
    >
      <Copy className="w-3 h-3 mr-1" /> Copy value
    </Button>
  </div>
);

const Field = ({ label, value, mono }) => (
  <div className="space-y-1">
    <span className="text-[11px] uppercase tracking-wide text-white/50">
      {label}
    </span>
    <div className="flex items-center gap-1">
      <code
        className={`flex-1 rounded border border-lime-400/15 bg-black px-2 py-1.5 text-white break-all ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => copy(value)}
        className="text-white/50 hover:text-lime-300"
        aria-label={`Copy ${label}`}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default function DomainSettings() {
  const { company, refreshCompany, loading } = useCompany();

  const [newSubdomain, setNewSubdomain] = useState("");
  const [newCustomDomain, setNewCustomDomain] = useState("");
  const [instructions, setInstructions] = useState(null);
  const [savingSub, setSavingSub] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [provider, setProvider] = useState(
    () => localStorage.getItem(PROVIDER_STORAGE_KEY) || "cloudflare",
  );

  const pickProvider = (id) => {
    setProvider(id);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, id);
    } catch {}
  };

  const updateSubdomain = async () => {
    if (!newSubdomain) return;
    setSavingSub(true);
    try {
      await base44.domains.updateSubdomain(newSubdomain);
      await refreshCompany();
      toast.success("Subdomain updated!");
      setNewSubdomain("");
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to update subdomain");
    } finally {
      setSavingSub(false);
    }
  };

  const addCustomDomain = async () => {
    if (!newCustomDomain) return;
    setAddingDomain(true);
    try {
      const res = await base44.domains.addCustomDomain(newCustomDomain);
      await refreshCompany();
      setInstructions(res.instructions);
      toast.success("Domain added! Now configure DNS records.");
      setNewCustomDomain("");
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      await base44.domains.verifyCustomDomain();
      await refreshCompany();
      setInstructions(null);
      toast.success("Domain verified! SSL is being provisioned.");
    } catch (err) {
      toast.error(err?.error || err?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove custom domain?")) return;
    setRemoving(true);
    try {
      await base44.domains.removeCustomDomain();
      await refreshCompany();
      setInstructions(null);
      toast.success("Custom domain removed");
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to remove domain");
    } finally {
      setRemoving(false);
    }
  };

  if (loading && !company) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
      </div>
    );
  }

  const subdomainUrl = company?.subdomain
    ? `https://${company.subdomain}.${MAIN_DOMAIN}`
    : "";

  return (
    <div className="min-h-screen bg-black p-4 text-white md:p-6 xl:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Globe className="w-8 h-8 text-lime-400" />
            Domain Settings
          </h1>
          <p className="text-white/60 mt-1">
            Manage how customers access your workspace
          </p>
        </div>

        {/* Subdomain */}
        <Card className="border-lime-400/15 bg-black text-white">
          <CardHeader>
            <CardTitle className="text-white">Workspace URL (Free)</CardTitle>
            <CardDescription className="text-white/60">
              Your default subdomain — always available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-lime-400/15 bg-black/60 p-4">
              <code className="flex-1 break-all text-sm text-white">
                https://
                <span className="font-bold text-lime-300">
                  {company?.subdomain || "—"}
                </span>
                .{MAIN_DOMAIN}
              </code>
              {company?.subdomain && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/70 hover:bg-lime-400/10 hover:text-lime-300"
                  onClick={() => copy(subdomainUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="new-subdomain"
                className={inputClass}
                value={newSubdomain}
                onChange={(e) =>
                  setNewSubdomain(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
              />
              <Button
                onClick={updateSubdomain}
                disabled={!newSubdomain || savingSub}
                className="bg-lime-400 text-black hover:bg-lime-300"
              >
                {savingSub ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Update Subdomain"
                )}
              </Button>
            </div>
            <p className="text-xs text-white/50">
              3–30 characters, lowercase letters, numbers, dashes only
            </p>
          </CardContent>
        </Card>

        {/* Custom domain */}
        <Card className="border-lime-400/15 bg-black text-white">
          <CardHeader>
            <CardTitle className="text-white">Custom Domain (Premium)</CardTitle>
            <CardDescription className="text-white/60">
              Use your own domain like <code>hr.yourcompany.com</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!company?.custom_domain ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="hr.yourcompany.com"
                  className={inputClass}
                  value={newCustomDomain}
                  onChange={(e) =>
                    setNewCustomDomain(e.target.value.toLowerCase().trim())
                  }
                />
                <Button
                  onClick={addCustomDomain}
                  disabled={!newCustomDomain || addingDomain}
                  className="bg-lime-400 text-black hover:bg-lime-300"
                >
                  {addingDomain ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add Domain"
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-lime-400/15 bg-black/60 p-4">
                  <div className="flex items-center gap-3">
                    <code className="break-all text-sm font-bold text-white">
                      {company.custom_domain}
                    </code>
                    {company.custom_domain_verified ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-400 text-xs">
                        <AlertCircle className="w-4 h-4" /> Pending
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={remove}
                    disabled={removing}
                  >
                    {removing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {!company.custom_domain_verified && (
                  <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-4 space-y-4">
                    <h3 className="font-bold text-yellow-300">
                      DNS Setup Required
                    </h3>
                    <p className="text-sm text-yellow-200/80">
                      Add these 2 DNS records at your domain registrar
                      (wherever you bought {company.custom_domain}):
                    </p>

                    <ProviderPicker
                      domain={company.custom_domain}
                      value={provider}
                      onChange={pickProvider}
                    />

                    {instructions ? (
                      <>
                        <DnsRecord record={instructions.cname} />
                        <DnsRecord record={instructions.txt} />
                      </>
                    ) : (
                      <p className="text-xs text-yellow-200/70 break-all">
                        Verification token:{" "}
                        <code className="text-white">
                          {company.custom_domain_verification_token}
                        </code>
                      </p>
                    )}

                    <Button
                      onClick={verify}
                      disabled={verifying}
                      className="w-full bg-lime-400 text-black hover:bg-lime-300"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                          Verifying…
                        </>
                      ) : (
                        "Verify Domain"
                      )}
                    </Button>
                  </div>
                )}

                {company.custom_domain_verified && (
                  <div className="rounded-lg border border-green-400/30 bg-green-400/5 p-4">
                    <p className="font-medium text-green-300">
                      Your custom domain is active!
                    </p>
                    <a
                      href={`https://${company.custom_domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lime-300 underline text-sm break-all"
                    >
                      https://{company.custom_domain}
                    </a>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
