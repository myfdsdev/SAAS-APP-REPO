import express from 'express';
import {
  createProject,
  getAllProjects,
  filterProjects,
  getProjectById,
  updateProject,
  deleteProject,
  toggleArchive,
} from '../controllers/project.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();
router.use(protect, requireCompany);

router.get('/filter', filterProjects);
router.put('/:id/archive', toggleArchive);

router.post('/', createProject);
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
