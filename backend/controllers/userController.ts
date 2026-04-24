import { Request, Response } from 'express';
import { query } from '../config/db';

// 1. Ambil semua user (Read)
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, full_name, email, role, is_active FROM users WHERE deleted_at IS NULL ORDER BY id DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update User (Update)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active } = req.body;
    await query(
      'UPDATE users SET full_name = $1, email = $2, role = $3, is_active = $4 WHERE id = $5',
      [full_name, email, role, is_active, id]
    );
    res.status(200).json({ success: true, message: 'User updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Delete User (Hard/Soft Delete)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [id]);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};