import express from "express";
import { getAppSettings, updateAppSettings } from "../controllers/appSettings.Controller.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { requireCompany } from "../middleware/tenantScope.js";

const router = express.Router();

router.get("/", optionalAuth, getAppSettings);
router.put("/", protect, requireCompany, updateAppSettings);

export default router;
