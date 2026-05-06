import Company from "../models/Company.js";
import {
  clearExpiredCompanySuspension,
  getCompanyAccessBlock,
} from "../utils/accessControl.js";

export const requireCompany = async (req, res, next) => {
  const companyId = req.user?.company_id?._id || req.user?.company_id;

  if (!companyId) {
    return res.status(403).json({ error: "No company associated with this user" });
  }

  const company = await Company.findById(companyId);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  await clearExpiredCompanySuspension(company);
  const accessBlock = getCompanyAccessBlock(company);
  if (accessBlock) {
    return res.status(403).json({ error: accessBlock.message, code: accessBlock.code });
  }

  req.company_id = companyId;
  req.company = company;
  next();
};

export const tenantFilter = (req, extra = {}) => ({
  company_id: req.company_id || req.user?.company_id,
  ...extra,
});
