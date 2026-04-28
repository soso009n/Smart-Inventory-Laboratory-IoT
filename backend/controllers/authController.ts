import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

// Mengambil kunci rahasia dari file .env
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

// 1. REGISTER: Buat Akun Baru (Admin / Praktikan)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, password, role } = req.body;

    // Cek apakah email sudah dipakai
    const userExists = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (userExists.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Email sudah terdaftar di sistem' });
      return;
    }

    // Enkripsi Password (Hashing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Masukkan ke database
    const result = await query(
      `INSERT INTO users (full_name, email, password, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role`,
      [full_name, email, hashedPassword, role || 'student']
    );

    res.status(201).json({ success: true, message: 'Registrasi berhasil', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal registrasi', error: error.message });
  }
};

// 2. LOGIN: Autentikasi Masuk
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const result = await query(`SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`, [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Email atau Password salah' });
      return;
    }

    const user = result.rows[0];

    // Bandingkan password yang dikirim dengan password yang dienkripsi di database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Email atau Password salah' });
      return;
    }

    // Buat JWT (Token Akses)
   // Buat JWT (Token Akses)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any } 
    );

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      token: token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server', error: error.message });
  }
};
