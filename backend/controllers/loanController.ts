import { Request, Response } from 'express';
import { query } from '../config/db';

// 1. CREATE: Catat peminjaman baru
export const createLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, item_id, due_date } = req.body;
    
    // Insert data pinjaman ke tabel loans
    const result = await query(
      `INSERT INTO loans (user_id, item_id, due_date) 
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, item_id, due_date]
    );

    // Update stok alat (kurangi 1)
    await query(
      `UPDATE items SET available_stock = available_stock - 1 WHERE id = $1`,
      [item_id]
    );

    res.status(201).json({ success: true, message: 'Peminjaman berhasil dicatat', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mencatat peminjaman', error: error.message });
  }
};

// 2. READ: Ambil data peminjaman dengan QUERY JOIN (Syarat TA No. 7)
export const getAllLoansWithDetails = async (_req: Request, res: Response): Promise<void> => {
  try {
    // JOIN 3 Tabel: loans + users + items
    const result = await query(`
      SELECT 
        l.id AS id_peminjaman,
        u.full_name AS nama_praktikan,
        i.item_name AS nama_alat,
        i.category AS kategori,
        l.borrow_date AS tanggal_pinjam,
        l.due_date AS tenggat_waktu,
        l.status AS status_pinjaman
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN items i ON l.item_id = i.id
      ORDER BY l.borrow_date DESC
    `);
    
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat', error: error.message });
  }
};

// 3. UPDATE: Kembalikan alat (Return)
export const returnItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Ubah status pinjaman jadi 'Returned' dan catat tanggal kembali
    const loanResult = await query(
      `UPDATE loans SET status = 'Returned', return_date = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING item_id`,
      [id]
    );

    if (loanResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan' });
      return;
    }

    const itemId = loanResult.rows[0].item_id;

    // Kembalikan stok alat (tambah 1)
    await query(
      `UPDATE items SET available_stock = available_stock + 1 WHERE id = $1`,
      [itemId]
    );

    res.status(200).json({ success: true, message: 'Alat berhasil dikembalikan' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal proses pengembalian', error: error.message });
  }
};