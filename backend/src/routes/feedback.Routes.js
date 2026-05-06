import express from "express";
import {
  createFeedback,
  getAllFeedback,
  getMyFeedback,
  updateFeedback,
} from "../controllers/feedback.Controller.js";
import { adminOnly, protect } from "../middleware/auth.js";
import { requireCompany } from "../middleware/tenantScope.js";

const router = express.Router();

router.use(protect, requireCompany);

router.post("/", createFeedback);
router.get("/me", getMyFeedback);
router.get("/", adminOnly, getAllFeedback);
router.put("/:id", adminOnly, updateFeedback);

export default router;
