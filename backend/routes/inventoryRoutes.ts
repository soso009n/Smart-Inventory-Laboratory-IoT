import { Router } from "express";
import {
  createItem,
  getAllItems,
  getItemById,
  getTrashItems,
  updateItem,
  softDeleteItem,
  restoreItem,
  permanentDeleteItem,
} from "../controllers/inventoryController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Active inventory
router.get("/", requireRole("admin", "student"), getAllItems);
router.post("/", requireRole("admin"), createItem);

// Trash routes - wajib sebelum /:id
router.get("/trash", requireRole("admin"), getTrashItems);
router.patch("/:id/restore", requireRole("admin"), restoreItem);
router.delete("/:id/permanent", requireRole("admin"), permanentDeleteItem);

// Dynamic item routes - taruh terakhir
router.get("/:id", requireRole("admin", "student"), getItemById);
router.put("/:id", requireRole("admin"), updateItem);
router.patch("/:id", requireRole("admin"), updateItem);
router.delete("/:id", requireRole("admin"), softDeleteItem);

export default router;