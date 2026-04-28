import { Router } from 'express';
import {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  softDeleteItem,
  restoreItem
} from '../controllers/inventoryController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Endpoint CRUD Inventory
router.post('/', requireRole('admin'), createItem); // Create
router.get('/', requireRole('admin', 'student'), getAllItems); // Read All
router.get('/:id', requireRole('admin', 'student'), getItemById); // Read One
router.put('/:id', requireRole('admin'), updateItem); // Update
router.patch('/:id', requireRole('admin'), updateItem); // Partial Update
router.delete('/:id', requireRole('admin'), softDeleteItem); // Soft Delete
router.patch('/:id/restore', requireRole('admin'), restoreItem); // Restore

export default router;
