import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { query } from "../config/db";

type UserRole = "admin" | "student";

type AuthDbUser = {
  id: number;
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean | null;
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const isValidRole = (role: unknown): role is UserRole => {
  return role === "admin" || role === "student";
};

const normalizeEmail = (email: unknown): string => {
  return String(email ?? "").trim().toLowerCase();
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown server error";
};

// 1. REGISTER: Buat Akun Baru
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const fullName = String(req.body.full_name ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const role: UserRole = isValidRole(req.body.role) ? req.body.role : "student";

    if (!fullName || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
      return;
    }

    const userExists = await query<{ id: number }>(
      `
      SELECT id
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email]
    );

    if (userExists.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: "Email sudah terdaftar di sistem",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query<{
      id: number;
      full_name: string;
      email: string;
      role: UserRole;
      is_active: boolean;
    }>(
      `
      INSERT INTO users (full_name, email, password, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, full_name, email, role, is_active
      `,
      [fullName, email, hashedPassword, role]
    );

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal registrasi",
      error: getErrorMessage(error),
    });
  }
};

// 2. LOGIN: Autentikasi Masuk
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
      return;
    }

    const result = await query<AuthDbUser>(
      `
      SELECT id, full_name, email, password, role, is_active
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Email atau Password salah",
      });
      return;
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      res.status(403).json({
        success: false,
        message: "Akun tidak aktif",
      });
      return;
    }

    if (!isValidRole(user.role)) {
      res.status(403).json({
        success: false,
        message: "Role user tidak valid",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Email atau Password salah",
      });
      return;
    }

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET as Secret,
      signOptions
    );

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: getErrorMessage(error),
    });
  }
};