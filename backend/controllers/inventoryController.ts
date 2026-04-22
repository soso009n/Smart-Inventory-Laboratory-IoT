import { Request, Response } from 'express';
import { query } from '../config/db';

// 1. CREATE: Tambah alat baru
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { item_name, category, total_stock } = req.body;
    // Status default 'Available', available_stock sama dengan total_stock di awal
    const result = await query(
      `INSERT INTO items (item_name, category, total_stock, available_stock) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [item_name, category, total_stock, total_stock]
    );
    res.status(201).json({ success: true, message: 'Alat berhasil ditambahkan', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menambah data', error: error.message });
  }
};

// 2. READ: Ambil semua data (Yang belum di-soft delete)
export const getAllItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT * FROM items WHERE deleted_at IS NULL ORDER BY id DESC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data', error: error.message });
  }
};

// 3. READ: Ambil detail 1 alat
export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Alat tidak ditemukan' });
      return;
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data', error: error.message });
  }
};

// 4. UPDATE: Ubah data alat
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { item_name, category, status, total_stock, available_stock } = req.body;
    
    const result = await query(
      `UPDATE items 
       SET item_name = $1, category = $2, status = $3, total_stock = $4, available_stock = $5 
       WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
      [item_name, category, status, total_stock, available_stock, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Alat tidak ditemukan / sudah dihapus' });
      return;
    }
    res.status(200).json({ success: true, message: 'Data berhasil diupdate', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal update data', error: error.message });
  }
};

// 5. DELETE: Soft Delete (Syarat TA No. 6)
export const softDeleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Kita tidak pakai DELETE FROM, tapi mengisi kolom deleted_at
    const result = await query(
      `UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Alat tidak ditemukan' });
      return;
    }
    res.status(200).json({ success: true, message: 'Data dipindahkan ke Trash (Soft Delete)', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data', error: error.message });
  }
};