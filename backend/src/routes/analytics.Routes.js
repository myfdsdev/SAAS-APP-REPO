import express from "express";
import {
  getMyAnalytics,
  getTeamAnalytics,
  getUserAnalytics,
  getUserTrends,
} from "../controllers/analytics.Controller.js";
import { adminOnly, protect } from "../middleware/auth.js";
import { requireCompany } from "../middleware/tenantScope.js";

const router = express.Router();

router.use(protect, requireCompany);

router.get("/me", getMyAnalytics);
router.get("/team", adminOnly, getTeamAnalytics);
router.get("/user/:userId", adminOnly, getUserAnalytics);
router.get("/trends/:userId", adminOnly, getUserTrends);

export default router;
