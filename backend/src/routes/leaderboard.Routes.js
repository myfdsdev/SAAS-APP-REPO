import express from "express";
import {
  awardCurrentEmployeeOfMonth,
  getLeaderboard,
  getMyRankAndAchievements,
} from "../controllers/leaderboard.Controller.js";
import { adminOnly, protect } from "../middleware/auth.js";
import { requireCompany } from "../middleware/tenantScope.js";

const router = express.Router();

router.use(protect, requireCompany);

router.get("/", getLeaderboard);
router.get("/me", getMyRankAndAchievements);
router.post("/employee-of-month", adminOnly, awardCurrentEmployeeOfMonth);

export default router;
