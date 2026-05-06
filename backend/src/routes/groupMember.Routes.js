import express from 'express';
import {
  getGroupMembers,
  filterGroupMembers,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
} from '../controllers/groupMember.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();
router.use(protect, requireCompany);

router.get('/filter', filterGroupMembers);

router.get('/', getGroupMembers);
router.post('/', addGroupMember);
router.put('/:id', updateGroupMemberRole);
router.delete('/:id', removeGroupMember);

export default router;
