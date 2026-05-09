import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getCompanyByHost,
  addCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
  updateSubdomain,
} from "../controllers/domain.Controller.js";

const router = express.Router();

// Public — frontend calls this on app load to discover the tenant from Host.
router.get("/info", getCompanyByHost);

// Admin only
router.post("/custom-domain", protect, addCustomDomain);
router.post("/custom-domain/verify", protect, verifyCustomDomain);
router.delete("/custom-domain", protect, removeCustomDomain);
router.put("/subdomain", protect, updateSubdomain);

export default router;
