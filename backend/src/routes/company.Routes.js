import express from "express";
import {
  createCompany,
  joinCompany,
  leaveCompany,
  listMyWorkspaces,
  switchWorkspace,
  setDefaultWorkspace,
  leaveSpecificWorkspace,
  getMyCompany,
  updateMyCompany,
  regenerateInviteCode,
  inviteByEmail,
  listInvites,
  listEmployees,
  updateEmployeeId,
  getCompanies,
  filterCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controllers/company.Controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.post("/create", createCompany);
router.post("/join", joinCompany);
router.post("/leave", leaveCompany);
router.get("/workspaces", listMyWorkspaces);
router.post("/switch/:companyId", switchWorkspace);
router.post("/default/:companyId", setDefaultWorkspace);
router.post("/leave/:companyId", leaveSpecificWorkspace);

router.get("/my", getMyCompany);
router.put("/my", updateMyCompany);
router.post("/regenerate-code", regenerateInviteCode);
router.post("/invite-email", inviteByEmail);
router.get("/invites", listInvites);
router.get("/employees", listEmployees);
router.put("/employee/:userId/employee-id", updateEmployeeId);

// Legacy/base44-compatible routes.
router.get("/filter", filterCompanies);
router.post("/", createCompany);
router.get("/", getCompanies);
router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.delete("/:id", deleteCompany);

export default router;
