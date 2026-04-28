import type { Request, Response } from "express";
import { query } from "../config/db";

type InventoryStatus = "Available" | "In Use" | "Maintenance";

type InventoryItemRow = {
  id: number;
  item_name: string;
  category: string;
  status: InventoryStatus;
  total_stock: number;
  available_stock: number;
  deleted_at: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

type IdRow = {
  id: number;
};

const VALID_STATUSES: InventoryStatus[] = ["Available", "In Use", "Maintenance"];

const parseId = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const parseNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const isValidStatus = (status: unknown): status is InventoryStatus => {
  return VALID_STATUSES.includes(status as InventoryStatus);
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

const normalizeItemPayload = (
  body: Record<string, unknown>,
  fallback?: InventoryItemRow
) => {
  const itemName =
    body.item_name ?? body.name ?? body.itemName ?? fallback?.item_name ?? "";

  const category = body.category ?? fallback?.category ?? "";
  const statusRaw = body.status ?? fallback?.status ?? "Available";

  const totalStockRaw = body.total_stock ?? body.totalStock;
  const availableStockRaw = body.available_stock ?? body.availableStock;

  const totalStock =
    totalStockRaw === undefined
      ? fallback
        ? Number(fallback.total_stock)
        : NaN
      : parseNumber(totalStockRaw);

  const availableStock =
    availableStockRaw === undefined
      ? fallback
        ? Number(fallback.available_stock)
        : totalStock
      : parseNumber(availableStockRaw);

  return {
    itemName: String(itemName).trim(),
    category: String(category).trim(),
    status: statusRaw,
    totalStock,
    availableStock,
  };
};

const validateItemPayload = (
  payload: ReturnType<typeof normalizeItemPayload>
): string | null => {
  if (!payload.itemName || payload.itemName.length < 2) {
    return "Nama alat minimal 2 karakter";
  }

  if (!payload.category) {
    return "Kategori wajib diisi";
  }

  if (!isValidStatus(payload.status)) {
    return "Status item tidak valid";
  }

  if (Number.isNaN(payload.totalStock) || Number.isNaN(payload.availableStock)) {
    return "Stock tidak valid";
  }

  if (!Number.isInteger(payload.totalStock) || !Number.isInteger(payload.availableStock)) {
    return "Stock harus berupa bilangan bulat";
  }

  if (payload.totalStock < 0 || payload.availableStock < 0) {
    return "Stock tidak boleh negatif";
  }

  if (payload.availableStock > payload.totalStock) {
    return "Available stock tidak boleh melebihi total stock";
  }

  return null;
};

// 1. CREATE: Tambah alat baru
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = normalizeItemPayload(req.body);
    const validationError = validateItemPayload(payload);

    if (validationError) {
      sendError(res, 400, validationError);
      return;
    }

    const result = await query<InventoryItemRow>(
      `
      INSERT INTO items (item_name, category, status, total_stock, available_stock)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        payload.itemName,
        payload.category,
        payload.status,
        payload.totalStock,
        payload.availableStock,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Alat berhasil ditambahkan",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal menambah data",
      error: getErrorMessage(error),
    });
  }
};

// 2. READ: Ambil semua data aktif
export const getAllItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<InventoryItemRow>(
      `
      SELECT *
      FROM items
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
      message: "Gagal mengambil data",
      error: getErrorMessage(error),
    });
  }
};

// 3. READ: Ambil detail 1 alat
export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID item tidak valid");
      return;
    }

    const result = await query<InventoryItemRow>(
      `
      SELECT *
      FROM items
      WHERE id = $1
        AND deleted_at IS NULL
      `,
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, "Alat tidak ditemukan");
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data",
      error: getErrorMessage(error),
    });
  }
};

// 4. UPDATE: Ubah data alat
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID item tidak valid");
      return;
    }

    const existing = await query<InventoryItemRow>(
      `
      SELECT *
      FROM items
      WHERE id = $1
        AND deleted_at IS NULL
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      sendError(res, 404, "Alat tidak ditemukan / sudah dihapus");
      return;
    }

    const payload = normalizeItemPayload(req.body, existing.rows[0]);
    const validationError = validateItemPayload(payload);

    if (validationError) {
      sendError(res, 400, validationError);
      return;
    }

    const result = await query<InventoryItemRow>(
      `
      UPDATE items
      SET item_name = $1,
          category = $2,
          status = $3,
          total_stock = $4,
          available_stock = $5
      WHERE id = $6
        AND deleted_at IS NULL
      RETURNING *
      `,
      [
        payload.itemName,
        payload.category,
        payload.status,
        payload.totalStock,
        payload.availableStock,
        id,
      ]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, "Alat tidak ditemukan / sudah dihapus");
      return;
    }

    res.status(200).json({
      success: true,
      message: "Data berhasil diupdate",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal update data",
      error: getErrorMessage(error),
    });
  }
};

// 5. DELETE: Soft Delete dari Inventory ke Trash
export const softDeleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID item tidak valid");
      return;
    }

    const result = await query<InventoryItemRow>(
      `
      UPDATE items
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, "Alat tidak ditemukan atau sudah berada di Trash");
      return;
    }

    res.status(200).json({
      success: true,
      message: "Data dipindahkan ke Trash",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data",
      error: getErrorMessage(error),
    });
  }
};

// 6. RESTORE: Kembalikan dari Trash ke Inventory
export const restoreItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID item tidak valid");
      return;
    }

    const result = await query<InventoryItemRow>(
      `
      UPDATE items
      SET deleted_at = NULL
      WHERE id = $1
        AND deleted_at IS NOT NULL
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, "Item tidak ditemukan di Trash");
      return;
    }

    res.status(200).json({
      success: true,
      message: "Item berhasil dipulihkan",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal memulihkan data",
      error: getErrorMessage(error),
    });
  }
};

// 7. TRASH: Ambil item yang sudah di-soft delete
export const getTrashItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<InventoryItemRow>(
      `
      SELECT *
      FROM items
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
      `
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data Trash",
      error: getErrorMessage(error),
    });
  }
};

// 8. PERMANENT DELETE: Hard delete dari Trash
export const permanentDeleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (Number.isNaN(id)) {
      sendError(res, 400, "ID item tidak valid");
      return;
    }

    const itemInTrash = await query<IdRow>(
      `
      SELECT id
      FROM items
      WHERE id = $1
        AND deleted_at IS NOT NULL
      LIMIT 1
      `,
      [id]
    );

    if (itemInTrash.rows.length === 0) {
      sendError(res, 404, "Item tidak ditemukan di Trash");
      return;
    }

    const relatedLoans = await query<IdRow>(
      `
      SELECT id
      FROM loans
      WHERE item_id = $1
      LIMIT 1
      `,
      [id]
    );

    if (relatedLoans.rows.length > 0) {
      sendError(
        res,
        400,
        "Item tidak bisa dihapus permanen karena masih memiliki riwayat peminjaman. Hapus riwayat loan terlebih dahulu atau biarkan item tetap di Trash."
      );
      return;
    }

    const result = await query<InventoryItemRow>(
      `
      DELETE FROM items
      WHERE id = $1
        AND deleted_at IS NOT NULL
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, "Item tidak ditemukan di Trash");
      return;
    }

    res.status(200).json({
      success: true,
      message: "Item berhasil dihapus permanen",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus item permanen",
      error: getErrorMessage(error),
    });
  }
};