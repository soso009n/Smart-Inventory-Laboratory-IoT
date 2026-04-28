import { Router } from "express";
import { getAllUsers, getStudents, updateUser, deleteUser } from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.use(requireRole("admin"));

// Collection routes
router.get("/", getAllUsers);
router.get("/students", getStudents);

// Dynamic user routes
router.put("/:id", updateUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;