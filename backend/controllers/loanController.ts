import type { Request, Response } from "express";
import { query, transaction } from "../config/db";

type UserRole = "admin" | "student";
type LoanStatus = "Borrowed" | "Returned" | "Overdue";

type LoanRow = {
  id: number;
  user_id: number;
  item_id: number;
  status: LoanStatus;
  due_date: Date | string;
  return_date: Date | string | null;
};

type LoanDetailRow = LoanRow & {
  borrow_date: Date | string;
  user_full_name: string;
  user_email: string;
  item_name: string;
  category: string;
  item_status: string;
};

type BorrowerRow = {
  id: number;
  role: UserRole;
  is_active: boolean | null;
  deleted_at: Date | string | null;
};

type ItemStockRow = {
  id: number;
  status: string;
  total_stock: number;
  available_stock: number;
  deleted_at?: Date | string | null;
};

type IdRow = {
  id: number;
};

const VALID_LOAN_STATUSES: LoanStatus[] = ["Borrowed", "Returned", "Overdue"];

const buildError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown server error";
};

const getErrorStatus = (error: unknown): number => {
  if (error instanceof Error && "status" in error) {
    const status = (error as Error & { status?: number }).status;
    return typeof status === "number" ? status : 500;
  }

  return 500;
};

const parseId = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const isValidLoanStatus = (status: unknown): status is LoanStatus => {
  return VALID_LOAN_STATUSES.includes(status as LoanStatus);
};

const ensureAuthenticated = (req: Request) => {
  const requester = req.user;

  if (!requester) {
    throw buildError(401, "Unauthorized");
  }

  return requester;
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

const buildLoanWhere = (conditions: string[]) => {
  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
};

// 1. CREATE: Catat peminjaman baru
export const createLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = ensureAuthenticated(req);

    const userId =
      requester.role === "student"
        ? requester.id
        : parseId(req.body.user_id ?? req.body.userId);

    const itemId = parseId(req.body.item_id ?? req.body.itemId);
    const dueDate = req.body.due_date ?? req.body.dueDate;

    if (Number.isNaN(itemId) || !dueDate) {
      throw buildError(400, "Data peminjaman tidak lengkap");
    }

    if (requester.role === "admin" && Number.isNaN(userId)) {
      throw buildError(400, "User peminjam wajib dipilih");
    }

    const result = await transaction(async (client) => {
      const userResult = await client.query<BorrowerRow>(
        `
        SELECT id, role, is_active, deleted_at
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw buildError(404, "User peminjam tidak ditemukan");
      }

      const borrower = userResult.rows[0];

      if (borrower.deleted_at) {
        throw buildError(400, "User peminjam sudah dihapus");
      }

      if (borrower.is_active === false) {
        throw buildError(400, "User peminjam tidak aktif");
      }

      if (borrower.role !== "student") {
        throw buildError(400, "Peminjam harus berstatus student");
      }

      const itemResult = await client.query<ItemStockRow>(
        `
        SELECT id, status, total_stock, available_stock, deleted_at
        FROM items
        WHERE id = $1
        FOR UPDATE
        `,
        [itemId]
      );

      if (itemResult.rows.length === 0) {
        throw buildError(404, "Item tidak ditemukan");
      }

      const item = itemResult.rows[0];

      if (item.deleted_at) {
        throw buildError(400, "Item sudah dihapus");
      }

      if (item.status === "Maintenance") {
        throw buildError(400, "Item sedang maintenance");
      }

      const availableStock = Number(item.available_stock);
      const totalStock = Number(item.total_stock);

      if (availableStock <= 0) {
        throw buildError(400, "Stock item tidak tersedia");
      }

      if (availableStock > totalStock) {
        throw buildError(400, "Stock item tidak valid");
      }

      const loanInsert = await client.query<LoanRow>(
        `
        INSERT INTO loans (user_id, item_id, due_date, status)
        VALUES ($1, $2, $3, 'Borrowed')
        RETURNING *
        `,
        [userId, itemId, dueDate]
      );

      await client.query(
        `
        UPDATE items
        SET available_stock = available_stock - 1
        WHERE id = $1
        `,
        [itemId]
      );

      return loanInsert.rows[0];
    });

    res.status(201).json({
      success: true,
      message: "Peminjaman berhasil dicatat",
      data: result,
    });
  } catch (error: unknown) {
    res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error) || "Gagal mencatat peminjaman",
    });
  }
};

// 2. READ: Ambil semua data peminjaman
export const getAllLoansWithDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = ensureAuthenticated(req);

    const conditions: string[] = ["l.deleted_at IS NULL"];
    const params: number[] = [];

    if (requester.role === "student") {
      params.push(requester.id);
      conditions.push(`l.user_id = $${params.length}`);
    }

    const result = await query<LoanDetailRow>(
      `
      ${loanSelect}
      ${buildLoanWhere(conditions)}
      ORDER BY l.borrow_date DESC
      `,
      params
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error) || "Gagal mengambil riwayat",
    });
  }
};

// 3. READ: Detail peminjaman
export const getLoanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = ensureAuthenticated(req);
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      throw buildError(400, "ID loan tidak valid");
    }

    const conditions = ["l.id = $1", "l.deleted_at IS NULL"];
    const params: number[] = [id];

    if (requester.role === "student") {
      params.push(requester.id);
      conditions.push(`l.user_id = $${params.length}`);
    }

    const result = await query<LoanDetailRow>(
      `
      ${loanSelect}
      ${buildLoanWhere(conditions)}
      `,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Data peminjaman tidak ditemukan",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error) || "Gagal mengambil data peminjaman",
    });
  }
};

// 4. UPDATE: Update data peminjaman umum, admin only dari route
export const updateLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const status = req.body.status;
    const dueDate = req.body.due_date ?? req.body.dueDate;
    const returnDate = req.body.return_date ?? req.body.returnDate;

    if (Number.isNaN(id)) {
      throw buildError(400, "ID loan tidak valid");
    }

    if (!status && !dueDate && !returnDate) {
      throw buildError(400, "Tidak ada data untuk diperbarui");
    }

    if (status !== undefined && !isValidLoanStatus(status)) {
      throw buildError(400, "Status loan tidak valid");
    }

    const updatedLoan = await transaction(async (client) => {
      const loanResult = await client.query<LoanRow>(
        `
        SELECT id, user_id, item_id, status, due_date, return_date
        FROM loans
        WHERE id = $1
          AND deleted_at IS NULL
        FOR UPDATE
        `,
        [id]
      );

      if (loanResult.rows.length === 0) {
        throw buildError(404, "Data peminjaman tidak ditemukan");
      }

      const loan = loanResult.rows[0];
      const nextStatus: LoanStatus = status ?? loan.status;

      if (loan.status === "Returned" && nextStatus !== "Returned") {
        throw buildError(400, "Tidak bisa mengubah status Returned menjadi status lain");
      }

      const shouldReturn = loan.status !== "Returned" && nextStatus === "Returned";

      const nextDueDate = dueDate ?? loan.due_date;
      const nextReturnDate =
        nextStatus === "Returned"
          ? returnDate ?? loan.return_date ?? new Date().toISOString()
          : returnDate ?? loan.return_date;

      if (shouldReturn) {
        const itemResult = await client.query<ItemStockRow>(
          `
          SELECT id, total_stock, available_stock
          FROM items
          WHERE id = $1
          FOR UPDATE
          `,
          [loan.item_id]
        );

        if (itemResult.rows.length === 0) {
          throw buildError(400, "Item tidak ditemukan");
        }

        const item = itemResult.rows[0];

        if (Number(item.available_stock) >= Number(item.total_stock)) {
          throw buildError(400, "Available stock sudah penuh");
        }

        await client.query(
          `
          UPDATE items
          SET available_stock = available_stock + 1
          WHERE id = $1
          `,
          [loan.item_id]
        );
      }

      const updateResult = await client.query<LoanRow>(
        `
        UPDATE loans
        SET status = $1,
            due_date = $2,
            return_date = $3
        WHERE id = $4
          AND deleted_at IS NULL
        RETURNING *
        `,
        [nextStatus, nextDueDate, nextReturnDate, id]
      );

      return updateResult.rows[0];
    });

    res.status(200).json({
      success: true,
      message: "Data peminjaman diperbarui",
      data: updatedLoan,
    });
  } catch (error: unknown) {
    res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error) || "Gagal memperbarui peminjaman",
    });
  }
};

// 5. UPDATE: Kembalikan alat
export const returnItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const requester = ensureAuthenticated(req);
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      throw buildError(400, "ID loan tidak valid");
    }

    await transaction(async (client) => {
      const loanResult = await client.query<LoanRow>(
        `
        SELECT id, user_id, item_id, status, due_date, return_date
        FROM loans
        WHERE id = $1
          AND deleted_at IS NULL
        FOR UPDATE
        `,
        [id]
      );

      if (loanResult.rows.length === 0) {
        throw buildError(404, "Data peminjaman tidak ditemukan");
      }

      const loan = loanResult.rows[0];

      if (requester.role === "student" && Number(loan.user_id) !== requester.id) {
        throw buildError(403, "Tidak diizinkan mengembalikan loan ini");
      }

      if (loan.status === "Returned") {
        throw buildError(400, "Loan sudah dikembalikan");
      }

      const itemResult = await client.query<ItemStockRow>(
        `
        SELECT id, total_stock, available_stock
        FROM items
        WHERE id = $1
        FOR UPDATE
        `,
        [loan.item_id]
      );

      if (itemResult.rows.length === 0) {
        throw buildError(400, "Item tidak ditemukan");
      }

      const item = itemResult.rows[0];

      if (Number(item.available_stock) >= Number(item.total_stock)) {
        throw buildError(400, "Available stock sudah penuh");
      }

      await client.query(
        `
        UPDATE loans
        SET status = 'Returned',
            return_date = COALESCE(return_date, CURRENT_TIMESTAMP)
        WHERE id = $1
          AND deleted_at IS NULL
        `,
        [id]
      );

      await client.query(
        `
        UPDATE items
        SET available_stock = available_stock + 1
        WHERE id = $1
        `,
        [loan.item_id]
      );
    });

    res.status(200).json({
      success: true,
      message: "Alat berhasil dikembalikan",
    });
  } catch (error: unknown) {
    res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error) || "Gagal proses pengembalian",
    });
  }
};

// 6. DELETE: Soft delete loan, admin only dari route
export const deleteLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      throw buildError(400, "ID loan tidak valid");
    }

    const result = await query<LoanRow>(
      `
      UPDATE loans
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Data peminjaman tidak ditemukan",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Loan dipindahkan ke trash",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error) || "Gagal menghapus loan",
    });
  }
};