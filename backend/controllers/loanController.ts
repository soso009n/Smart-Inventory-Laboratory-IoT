import { Request, Response } from 'express';
import { query, transaction } from '../config/db';

type LoanRow = {
  id: number;
  user_id: number;
  item_id: number;
  status: string;
  due_date: string;
  return_date: string | null;
};

const buildError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

let loansDeletedAtChecked = false;
let loansHasDeletedAt = false;

const ensureLoansDeletedAt = async () => {
  if (loansDeletedAtChecked) return loansHasDeletedAt;
  const result = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'deleted_at'`
  );
  loansHasDeletedAt = result.rows.length > 0;
  loansDeletedAtChecked = true;
  return loansHasDeletedAt;
};

const loanSelect = `
  SELECT
    l.id,
    l.user_id,
    l.item_id,
    l.borrow_date,
    l.due_date,
    l.return_date,
    l.status,
    u.full_name AS user_full_name,
    u.email AS user_email,
    i.item_name,
    i.category,
    i.status AS item_status
  FROM loans l
  JOIN users u ON l.user_id = u.id
  JOIN items i ON l.item_id = i.id
`;

const buildLoanWhere = (conditions: string[]) =>
  conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

// 1. CREATE: Catat peminjaman baru
export const createLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      throw buildError(401, 'Unauthorized');
    }

    const userId =
      requester.role === 'student'
        ? requester.id
        : Number(req.body.user_id ?? req.body.userId);
    const itemId = Number(req.body.item_id ?? req.body.itemId);
    const dueDate = req.body.due_date ?? req.body.dueDate;

    if (!itemId || Number.isNaN(itemId) || !dueDate) {
      throw buildError(400, 'Data peminjaman tidak lengkap');
    }

    if (requester.role === 'admin' && (!userId || Number.isNaN(userId))) {
      throw buildError(400, 'User peminjam wajib dipilih');
    }

    const result = await transaction(async (client) => {
      const userResult = await client.query(
        `SELECT id, role, is_active, deleted_at FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw buildError(404, 'User peminjam tidak ditemukan');
      }

      const borrower = userResult.rows[0];
      if (borrower.deleted_at) {
        throw buildError(400, 'User peminjam sudah dihapus');
      }
      if (borrower.is_active === false) {
        throw buildError(400, 'User peminjam tidak aktif');
      }
      if (borrower.role !== 'student') {
        throw buildError(400, 'Peminjam harus berstatus student');
      }

      const itemResult = await client.query(
        `SELECT id, status, total_stock, available_stock, deleted_at FROM items WHERE id = $1 FOR UPDATE`,
        [itemId]
      );

      if (itemResult.rows.length === 0) {
        throw buildError(404, 'Item tidak ditemukan');
      }

      const item = itemResult.rows[0];
      if (item.deleted_at) {
        throw buildError(400, 'Item sudah dihapus');
      }
      if (item.status === 'Maintenance') {
        throw buildError(400, 'Item sedang maintenance');
      }

      const availableStock = Number(item.available_stock);
      const totalStock = Number(item.total_stock);
      if (availableStock <= 0) {
        throw buildError(400, 'Stock item tidak tersedia');
      }
      if (availableStock > totalStock) {
        throw buildError(400, 'Stock item tidak valid');
      }

      const loanInsert = await client.query(
        `INSERT INTO loans (user_id, item_id, due_date, status)
         VALUES ($1, $2, $3, 'Borrowed') RETURNING *`,
        [userId, itemId, dueDate]
      );

      await client.query(`UPDATE items SET available_stock = available_stock - 1 WHERE id = $1`, [itemId]);

      return loanInsert.rows[0];
    });

    res.status(201).json({ success: true, message: 'Peminjaman berhasil dicatat', data: result });
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message || 'Gagal mencatat peminjaman' });
  }
};

// 2. READ: Ambil semua data peminjaman
export const getAllLoansWithDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      throw buildError(401, 'Unauthorized');
    }

    const hasDeletedAt = await ensureLoansDeletedAt();
    const conditions: string[] = [];
    const params: Array<number> = [];

    if (hasDeletedAt) {
      conditions.push('l.deleted_at IS NULL');
    }

    if (requester.role === 'student') {
      params.push(requester.id);
      conditions.push(`l.user_id = $${params.length}`);
    }

    const result = await query(`${loanSelect} ${buildLoanWhere(conditions)} ORDER BY l.borrow_date DESC`, params);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message || 'Gagal mengambil riwayat' });
  }
};

// 3. READ: Detail peminjaman
export const getLoanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      throw buildError(401, 'Unauthorized');
    }

    const hasDeletedAt = await ensureLoansDeletedAt();
    const conditions = ['l.id = $1'];
    const params: Array<number | string> = [req.params.id];

    if (hasDeletedAt) {
      conditions.push('l.deleted_at IS NULL');
    }

    if (requester.role === 'student') {
      params.push(requester.id);
      conditions.push(`l.user_id = $${params.length}`);
    }

    const result = await query(`${loanSelect} ${buildLoanWhere(conditions)}`, params);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message || 'Gagal mengambil data peminjaman' });
  }
};

// 4. UPDATE: Update data peminjaman (admin)
export const updateLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, due_date, return_date } = req.body;

    if (!status && !due_date && !return_date) {
      throw buildError(400, 'Tidak ada data untuk diperbarui');
    }

    const hasDeletedAt = await ensureLoansDeletedAt();

    const updatedLoan = await transaction(async (client) => {
      const loanQuery = `SELECT id, user_id, item_id, status, due_date, return_date FROM loans WHERE id = $1${
        hasDeletedAt ? ' AND deleted_at IS NULL' : ''
      } FOR UPDATE`;
      const loanResult = await client.query<LoanRow>(loanQuery, [id]);

      if (loanResult.rows.length === 0) {
        throw buildError(404, 'Data peminjaman tidak ditemukan');
      }

      const loan = loanResult.rows[0];
      const nextStatus = status ?? loan.status;

      if (loan.status === 'Returned' && nextStatus !== 'Returned') {
        throw buildError(400, 'Tidak bisa mengubah status Returned menjadi status lain');
      }

      const shouldReturn = loan.status !== 'Returned' && nextStatus === 'Returned';
      const nextDueDate = due_date ?? loan.due_date;
      const nextReturnDate =
        nextStatus === 'Returned' ? return_date ?? loan.return_date ?? new Date().toISOString() : return_date ?? loan.return_date;

      if (shouldReturn) {
        const itemResult = await client.query(
          `SELECT id, total_stock, available_stock FROM items WHERE id = $1 FOR UPDATE`,
          [loan.item_id]
        );
        if (itemResult.rows.length === 0) {
          throw buildError(400, 'Item tidak ditemukan');
        }
        const item = itemResult.rows[0];
        if (Number(item.available_stock) >= Number(item.total_stock)) {
          throw buildError(400, 'Available stock sudah penuh');
        }

        await client.query(`UPDATE items SET available_stock = available_stock + 1 WHERE id = $1`, [
          loan.item_id,
        ]);
      }

      const updateResult = await client.query(
        `UPDATE loans SET status = $1, due_date = $2, return_date = $3 WHERE id = $4 RETURNING *`,
        [nextStatus, nextDueDate, nextReturnDate, id]
      );

      return updateResult.rows[0];
    });

    res.status(200).json({ success: true, message: 'Data peminjaman diperbarui', data: updatedLoan });
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message || 'Gagal memperbarui peminjaman' });
  }
};

// 5. UPDATE: Kembalikan alat (Return)
export const returnItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      throw buildError(401, 'Unauthorized');
    }

    const { id } = req.params;
    const hasDeletedAt = await ensureLoansDeletedAt();

    await transaction(async (client) => {
      const loanQuery = `SELECT id, user_id, item_id, status FROM loans WHERE id = $1${
        hasDeletedAt ? ' AND deleted_at IS NULL' : ''
      } FOR UPDATE`;
      const loanResult = await client.query(loanQuery, [id]);
      if (loanResult.rows.length === 0) {
        throw buildError(404, 'Data peminjaman tidak ditemukan');
      }

      const loan = loanResult.rows[0];
      if (requester.role === 'student' && Number(loan.user_id) !== requester.id) {
        throw buildError(403, 'Tidak diizinkan mengembalikan loan ini');
      }

      if (loan.status === 'Returned') {
        throw buildError(400, 'Loan sudah dikembalikan');
      }

      const itemResult = await client.query(
        `SELECT id, total_stock, available_stock FROM items WHERE id = $1 FOR UPDATE`,
        [loan.item_id]
      );
      if (itemResult.rows.length === 0) {
        throw buildError(400, 'Item tidak ditemukan');
      }

      const item = itemResult.rows[0];
      if (Number(item.available_stock) >= Number(item.total_stock)) {
        throw buildError(400, 'Available stock sudah penuh');
      }

      await client.query(
        `UPDATE loans SET status = 'Returned', return_date = COALESCE(return_date, CURRENT_TIMESTAMP) WHERE id = $1`,
        [id]
      );
      await client.query(`UPDATE items SET available_stock = available_stock + 1 WHERE id = $1`, [loan.item_id]);
    });

    res.status(200).json({ success: true, message: 'Alat berhasil dikembalikan' });
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message || 'Gagal proses pengembalian' });
  }
};

// 6. DELETE: Soft delete loan (admin)
export const deleteLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hasDeletedAt = await ensureLoansDeletedAt();

    if (hasDeletedAt) {
      const result = await query(`UPDATE loans SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan' });
        return;
      }
      res.status(200).json({ success: true, message: 'Loan dipindahkan ke trash', data: result.rows[0] });
      return;
    }

    const result = await query(`DELETE FROM loans WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan' });
      return;
    }
    res.status(200).json({ success: true, message: 'Loan berhasil dihapus', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus loan' });
  }
};
