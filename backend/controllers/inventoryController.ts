import { Request, Response } from 'express';
import { query } from '../config/db';

const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const buildErrorResponse = (res: Response, status: number, message: string) => {
  res.status(status).json({ success: false, message });
};

// 1. CREATE: Tambah alat baru
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item_name = req.body.item_name ?? req.body.name ?? req.body.itemName;
    const category = req.body.category;
    const status = req.body.status ?? 'Available';
    const totalStock = parseNumber(req.body.total_stock ?? req.body.totalStock);
    const availableStock =
      req.body.available_stock !== undefined || req.body.availableStock !== undefined
        ? parseNumber(req.body.available_stock ?? req.body.availableStock)
        : totalStock;

    if (!item_name || !category || Number.isNaN(totalStock) || Number.isNaN(availableStock)) {
      buildErrorResponse(res, 400, 'Data item tidak lengkap atau tidak valid');
      return;
    }

    if (totalStock < 0 || availableStock < 0) {
      buildErrorResponse(res, 400, 'Stock tidak boleh negatif');
      return;
    }

    if (availableStock > totalStock) {
      buildErrorResponse(res, 400, 'Available stock tidak boleh melebihi total stock');
      return;
    }

    const result = await query(
      `INSERT INTO items (item_name, category, status, total_stock, available_stock) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [item_name, category, status, totalStock, availableStock]
    );
    res.status(201).json({ success: true, message: 'Alat berhasil ditambahkan', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menambah data', error: error.message });
  }
};

// 2. READ: Ambil semua data (Yang belum di-soft delete)
export const getAllItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT * FROM items WHERE deleted_at IS NULL ORDER BY id DESC`);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data', error: error.message });
  }
};

// 3. READ: Ambil detail 1 alat
export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL`, [id]);
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
    const existing = await query(`SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Alat tidak ditemukan / sudah dihapus' });
      return;
    }

    const current = existing.rows[0];
    const item_name = req.body.item_name ?? req.body.name ?? req.body.itemName ?? current.item_name;
    const category = req.body.category ?? current.category;
    const status = req.body.status ?? current.status;
    const totalStockRaw = req.body.total_stock ?? req.body.totalStock;
    const availableStockRaw = req.body.available_stock ?? req.body.availableStock;

    const totalStock =
      totalStockRaw === undefined ? Number(current.total_stock) : parseNumber(totalStockRaw);
    const availableStock =
      availableStockRaw === undefined ? Number(current.available_stock) : parseNumber(availableStockRaw);

    if (Number.isNaN(totalStock) || Number.isNaN(availableStock)) {
      buildErrorResponse(res, 400, 'Stock tidak valid');
      return;
    }

    if (totalStock < 0 || availableStock < 0) {
      buildErrorResponse(res, 400, 'Stock tidak boleh negatif');
      return;
    }

    if (availableStock > totalStock) {
      buildErrorResponse(res, 400, 'Available stock tidak boleh melebihi total stock');
      return;
    }

    const result = await query(
      `UPDATE items 
       SET item_name = $1, category = $2, status = $3, total_stock = $4, available_stock = $5 
       WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
      [item_name, category, status, totalStock, availableStock, id]
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
    const result = await query(
      `UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id]
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

// 6. RESTORE: Kembalikan dari Trash
export const restoreItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE items SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Item tidak ditemukan di trash' });
      return;
    }

    res.status(200).json({ success: true, message: 'Item berhasil dipulihkan', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memulihkan data', error: error.message });
  }
};
