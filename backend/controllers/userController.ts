import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db";

type UserRole = "admin" | "student";

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  deleted_at: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

type IdRow = {
  id: number;
};

type ActiveLoanRow = {
  id: number;
};

const isValidRole = (role: unknown): role is UserRole => {
  return role === "admin" || role === "student";
};

const parseId = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const normalizeEmail = (email: unknown): string => {
  return String(email ?? "").trim().toLowerCase();
};

const normalizeName = (name: unknown): string => {
  return String(name ?? "").trim();
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown server error";
};

const sendError = (res: Response, status: number, message: string): void => {
  res.status(status).json({
    success: false,
    message,
  });
};

const parseBoolean = (value: unknown, fallback = true): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<UserRow>(
      `
      SELECT id, full_name, email, role, is_active, deleted_at, created_at, updated_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY id DESC
      `
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || "Gagal mengambil data user",
    });
  }
};

export const getStudents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<UserRow>(
      `
      SELECT id, full_name, email, role, is_active, deleted_at, created_at, updated_at
      FROM users
      WHERE role = 'student'
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY full_name ASC
      `
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || "Gagal mengambil data student",
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID user tidak valid");
      return;
    }

    const fullName = normalizeName(req.body.full_name);
    const email = normalizeEmail(req.body.email);
    const role = req.body.role;
    const isActive = parseBoolean(req.body.is_active, true);
    const password = String(req.body.password ?? "").trim();

    if (!fullName || !email || !isValidRole(role)) {
      sendError(res, 400, "full_name, email, dan role wajib valid");
      return;
    }

    if (password && password.length < 6) {
      sendError(res, 400, "Password minimal 6 karakter");
      return;
    }

    const existing = await query<UserRow>(
      `
      SELECT id, full_name, email, role, is_active, deleted_at
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      sendError(res, 404, "User tidak ditemukan");
      return;
    }

    const existingUser = existing.rows[0];

    if (req.user && req.user.id === id) {
      if (role !== "admin") {
        sendError(res, 400, "Admin tidak boleh mengubah role akun sendiri");
        return;
      }

      if (!isActive) {
        sendError(res, 400, "Admin tidak boleh menonaktifkan akun sendiri");
        return;
      }
    }

    const duplicateEmail = await query<IdRow>(
      `
      SELECT id
      FROM users
      WHERE email = $1
        AND id <> $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email, id]
    );

    if (duplicateEmail.rows.length > 0) {
      sendError(res, 400, "Email sudah digunakan user lain");
      return;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await query<UserRow>(
        `
        UPDATE users
        SET full_name = $1,
            email = $2,
            role = $3,
            is_active = $4,
            password = $5
        WHERE id = $6
          AND deleted_at IS NULL
        RETURNING id, full_name, email, role, is_active, deleted_at, created_at, updated_at
        `,
        [fullName, email, role, isActive, hashedPassword, id]
      );

      res.status(200).json({
        success: true,
        message: "User updated",
        data: result.rows[0],
      });
      return;
    }

    const result = await query<UserRow>(
      `
      UPDATE users
      SET full_name = $1,
          email = $2,
          role = $3,
          is_active = $4
      WHERE id = $5
        AND deleted_at IS NULL
      RETURNING id, full_name, email, role, is_active, deleted_at, created_at, updated_at
      `,
      [fullName, email, role, isActive, id]
    );

    res.status(200).json({
      success: true,
      message: "User updated",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || "Gagal update user",
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID user tidak valid");
      return;
    }

    if (req.user && id === req.user.id) {
      sendError(res, 400, "Admin tidak boleh menghapus akun sendiri");
      return;
    }

    const existing = await query<UserRow>(
      `
      SELECT id, full_name, email, role, is_active, deleted_at
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      sendError(res, 404, "User tidak ditemukan");
      return;
    }

    const activeLoans = await query<ActiveLoanRow>(
      `
      SELECT id
      FROM loans
      WHERE user_id = $1
        AND status IN ('Borrowed', 'Overdue')
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (activeLoans.rows.length > 0) {
      sendError(res, 400, "User masih memiliki peminjaman aktif");
      return;
    }

    const result = await query<UserRow>(
      `
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP,
          is_active = false
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, full_name, email, role, is_active, deleted_at, created_at, updated_at
      `,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "User deleted",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error) || "Gagal menghapus user",
    });
  }
};