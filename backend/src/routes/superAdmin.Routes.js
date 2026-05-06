import express from "express";
import {
  getCompanyDetails,
  listCompanies,
  listUsers,
  setCompanyStatus,
  setUserAccess,
  softDeleteCompany,
  updateUserRole,
} from "../controllers/superAdmin.Controller.js";
import { protect, superAdminOnly } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, superAdminOnly);

router.get("/companies", listCompanies);
router.get("/companies/:id", getCompanyDetails);
router.put("/companies/:id/status", setCompanyStatus);
router.delete("/companies/:id", softDeleteCompany);

router.get("/users", listUsers);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/access", setUserAccess);

export default router;
