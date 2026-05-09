import Company from "../models/Company.js";

const SYSTEM_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "static",
  "cdn",
]);

// Identify the tenant company from the incoming Host header.
// Order: verified custom_domain → subdomain of MAIN_DOMAIN → none.
// On localhost / IP hosts we no-op so dev still works.
export const resolveCompanyFromDomain = async (req, res, next) => {
  try {
    const host = String(req.hostname || "").toLowerCase();
    const mainDomain = (process.env.MAIN_DOMAIN || "").toLowerCase();

    if (
      !host ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)
    ) {
      req.domain_type = "main";
      return next();
    }

    let company = await Company.findOne({
      custom_domain: host,
      custom_domain_verified: true,
    });
    let domainType = "main";

    if (company) {
      domainType = "custom";
    } else if (mainDomain && host.endsWith(`.${mainDomain}`) && host !== mainDomain) {
      const subdomain = host.slice(0, -1 - mainDomain.length);
      if (subdomain && !SYSTEM_SUBDOMAINS.has(subdomain)) {
        company = await Company.findOne({ subdomain });
        if (company) domainType = "subdomain";
      }
    }

    if (company) {
      req.resolved_company = company;
      req.resolved_company_id = company._id;
    }
    req.domain_type = domainType;
    next();
  } catch (error) {
    console.error("[domainResolver] error:", error.message);
    next();
  }
};
