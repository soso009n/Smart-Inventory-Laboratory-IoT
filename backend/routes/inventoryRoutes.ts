import { Router } from 'express';
import { 
  createItem, 
  getAllItems, 
  getItemById, 
  updateItem, 
  softDeleteItem 
} from '../controllers/inventoryController';

const router = Router();

// Endpoint CRUD Inventory
router.post('/', createItem);           // Create
router.get('/', getAllItems);           // Read All
router.get('/:id', getItemById);        // Read One
router.put('/:id', updateItem);         // Update
router.delete('/:id', softDeleteItem);  // Soft Delete

export default router;