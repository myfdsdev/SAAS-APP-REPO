import express from 'express';
import {
  createTask,
  getTasks,
  filterTasks,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks,
} from '../controllers/task.Controller.js';
import { protect } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();
router.use(protect, requireCompany);

router.get('/filter', filterTasks);
router.put('/reorder', reorderTasks);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
