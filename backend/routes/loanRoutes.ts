import { Router } from "express";
import {
  createLoan,
  getAllLoansWithDetails,
  getLoanById,
  updateLoan,
  returnItem,
  deleteLoan,
} from "../controllers/loanController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Collection routes
router.get("/", requireRole("admin", "student"), getAllLoansWithDetails);
router.post("/", requireRole("admin", "student"), createLoan);

// Special loan routes - keep before "/:id" style routes
router.patch("/:id/return", requireRole("admin", "student"), returnItem);
router.put("/return/:id", requireRole("admin", "student"), returnItem); // legacy alias

// Dynamic loan routes
router.get("/:id", requireRole("admin", "student"), getLoanById);
router.patch("/:id", requireRole("admin"), updateLoan);
router.delete("/:id", requireRole("admin"), deleteLoan);

export default router;