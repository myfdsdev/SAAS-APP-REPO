import dns from "dns/promises";
import crypto from "crypto";
import Company from "../models/Company.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// Lazy import to avoid a circular dep with server.js (server.js imports this controller via routes).
const bustCorsCache = async () => {
  try {
    const mod = await import("../../server.js");
    if (typeof mod.invalidateCorsCache === "function") {
      await mod.invalidateCorsCache();
    }
  } catch {
    /* server.js not yet loaded in some test contexts — safe to ignore */
  }
};

const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const SUBDOMAIN_REGEX = /^[a-z0-9-]{3,30}$/;

const requireAdmin = (req, res) => {
  if (!req.user?.company_id) {
    res.status(403).json({ error: "No company associated with this user" });
    return false;
  }
  // Super admins implicitly count as admin.
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    res.status(403).json({ error: "Admin only" });
    return false;
  }
  return true;
};

// GET /api/domains/info — public; uses resolveCompanyFromDomain.
export const getCompanyByHost = asyncHandler(async (req, res) => {
  if (req.resolved_company) {
    return res.json({
      company: req.resolved_company,
      domain_type: req.domain_type,
    });
  }
  res.json({ company: null, domain_type: req.domain_type || "main" });
});

// POST /api/domains/custom-domain — admin only
export const addCustomDomain = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const raw = String(req.body.domain || "").toLowerCase().trim();
  if (!raw || !DOMAIN_REGEX.test(raw)) {
    return res.status(400).json({ error: "Invalid domain format" });
  }

  const mainDomain = (process.env.MAIN_DOMAIN || "").toLowerCase();
  const blocked = new Set(
    ["google.com", "facebook.com", "localhost", mainDomain].filter(Boolean),
  );
  if (blocked.has(raw)) {
    return res.status(400).json({ error: "This domain is not allowed" });
  }

  const existing = await Company.findOne({ custom_domain: raw });
  if (existing && String(existing._id) !== String(req.user.company_id)) {
    return res.status(409).json({ error: "This domain is already in use" });
  }

  const token = crypto.randomBytes(16).toString("hex");

  const company = await Company.findByIdAndUpdate(
    req.user.company_id,
    {
      custom_domain: raw,
      custom_domain_verification_token: token,
      custom_domain_verified: false,
      custom_domain_added_at: new Date(),
      custom_domain_verified_at: null,
      ssl_status: "none",
    },
    { new: true },
  );

  // Compute the CNAME "name" the user must enter at their DNS provider.
  // Most DNS UIs ask for the host *relative to the root zone*:
  //   apex (acme.com)            -> "@"   (note: requires ALIAS/ANAME, true CNAME at apex isn't valid)
  //   one level (hr.acme.com)    -> "hr"
  //   nested (team.app.acme.com) -> "team.app"
  const labels = raw.split(".");
  const isApex = labels.length <= 2;
  const cnameName = isApex ? "@" : labels.slice(0, -2).join(".");

  res.json({
    company,
    instructions: {
      cname: {
        type: isApex ? "ALIAS / ANAME" : "CNAME",
        name: cnameName,
        host: raw,
        value: mainDomain || "yourapp.com",
        description: isApex
          ? "Apex domains can't use a real CNAME — use ALIAS/ANAME if your registrar supports it, otherwise add at a subdomain like 'app.' instead."
          : "Add this CNAME record at your domain registrar",
      },
      txt: {
        type: "TXT",
        name: `_attendease-verify.${raw}`,
        host: `_attendease-verify.${raw}`,
        value: `attendease-verify=${token}`,
        description: "Add this TXT record to verify domain ownership",
      },
    },
  });
});

// POST /api/domains/custom-domain/verify — admin only
export const verifyCustomDomain = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const company = await Company.findById(req.user.company_id);
  if (!company?.custom_domain) {
    return res.status(400).json({ error: "No custom domain set" });
  }
  if (company.custom_domain_verified) {
    return res.json({ verified: true, message: "Already verified", company });
  }

  try {
    const txtRecords = await dns.resolveTxt(`_attendease-verify.${company.custom_domain}`);
    const flat = txtRecords.flat().join(" ");
    const expected = `attendease-verify=${company.custom_domain_verification_token}`;

    if (flat.includes(expected)) {
      company.custom_domain_verified = true;
      company.custom_domain_verified_at = new Date();
      company.ssl_status = "pending";
      await company.save();
      await bustCorsCache();
      return res.json({
        verified: true,
        message: "Domain verified! SSL will be active within a few minutes.",
        company,
      });
    }

    return res.status(400).json({
      verified: false,
      error: "TXT record not found or value mismatch. DNS may take time to propagate.",
    });
  } catch (error) {
    return res.status(400).json({
      verified: false,
      error:
        "DNS lookup failed. Make sure both CNAME and TXT records are added correctly.",
      detail: error.message,
    });
  }
});

// DELETE /api/domains/custom-domain — admin only
export const removeCustomDomain = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const company = await Company.findByIdAndUpdate(
    req.user.company_id,
    {
      custom_domain: null,
      custom_domain_verified: false,
      custom_domain_verification_token: null,
      custom_domain_added_at: null,
      custom_domain_verified_at: null,
      ssl_status: "none",
    },
    { new: true },
  );

  await bustCorsCache();
  res.json({ message: "Custom domain removed", company });
});

// PUT /api/domains/subdomain — admin only
export const updateSubdomain = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const subdomain = String(req.body.subdomain || "").toLowerCase().trim();
  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    return res.status(400).json({
      error:
        "Subdomain must be 3-30 characters, lowercase letters, numbers, and dashes only",
    });
  }
  if (["www", "app", "api", "admin", "mail"].includes(subdomain)) {
    return res.status(400).json({ error: "This subdomain is reserved" });
  }

  const existing = await Company.findOne({ subdomain });
  if (existing && String(existing._id) !== String(req.user.company_id)) {
    return res.status(409).json({ error: "This subdomain is taken" });
  }

  const company = await Company.findByIdAndUpdate(
    req.user.company_id,
    { subdomain },
    { new: true },
  );

  res.json({ company });
});
