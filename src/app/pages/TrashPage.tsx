import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RotateCcw, Trash2, AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import Badge from "../components/Badge";
import { useAuth } from "../../contexts/AuthContext";

type InventoryStatus = "Available" | "In Use" | "Maintenance";

type DeletedInventoryItem = {
  id: number;
  item_name: string;
  category: string;
  status: InventoryStatus;
  total_stock: number;
  available_stock: number;
  deleted_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  message?: string;
};

type ApiItemResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555";

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getBadgeVariant = (status: InventoryStatus) => {
  if (status === "Available") return "success";
  if (status === "In Use") return "info";
  return "warning";
};

export default function TrashPage() {
  const { token } = useAuth();
  const [deletedItems, setDeletedItems] = useState<DeletedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);
  const [itemTarget, setItemTarget] = useState<DeletedInventoryItem | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchDeletedItems = useCallback(async () => {
    if (!token) {
      setError("Token tidak tersedia. Silakan login ulang.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<ApiListResponse<DeletedInventoryItem>>(
        `${API_BASE_URL}/api/inventory/trash`,
        {
          headers: authHeaders,
        }
      );

      setDeletedItems(response.data.data ?? []);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : "Gagal mengambil data trash";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    fetchDeletedItems();
  }, [fetchDeletedItems]);

  const openRestore = (item: DeletedInventoryItem) => {
    setItemTarget(item);
    setIsRestoreModalOpen(true);
  };

  const openPermanentDelete = (item: DeletedInventoryItem) => {
    setItemTarget(item);
    setIsPermanentDeleteModalOpen(true);
  };

  const handleRestore = async () => {
    if (!itemTarget) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.patch<ApiItemResponse<DeletedInventoryItem>>(
        `${API_BASE_URL}/api/inventory/${itemTarget.id}/restore`,
        {},
        {
          headers: authHeaders,
        }
      );

      setDeletedItems((current) => current.filter((item) => item.id !== itemTarget.id));
      setItemTarget(null);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : "Gagal memulihkan item";

      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemTarget) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.delete<ApiItemResponse<DeletedInventoryItem>>(
        `${API_BASE_URL}/api/inventory/${itemTarget.id}/permanent`,
        {
          headers: authHeaders,
        }
      );

      setDeletedItems((current) => current.filter((item) => item.id !== itemTarget.id));
      setItemTarget(null);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : "Gagal menghapus item permanen";

      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl text-red-900 mb-1">Trash / Deleted Data</h1>
            <p className="text-red-700">
              Items in trash can be restored or permanently deleted. Permanent deletion cannot be
              undone.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={fetchDeletedItems}
            className="inline-flex items-center gap-2 rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Mengambil data trash...</p>
          </div>
        ) : deletedItems.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No deleted items</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-6 py-3 text-sm">Item Name</th>
                  <th className="text-left px-6 py-3 text-sm">Category</th>
                  <th className="text-left px-6 py-3 text-sm">Status</th>
                  <th className="text-left px-6 py-3 text-sm">Total Stock</th>
                  <th className="text-left px-6 py-3 text-sm">Available Stock</th>
                  <th className="text-left px-6 py-3 text-sm">Deleted Date</th>
                  <th className="text-left px-6 py-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deletedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">{item.item_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.category}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-6 py-4">{item.total_stock}</td>
                    <td className="px-6 py-4">{item.available_stock}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {formatDate(item.deleted_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openRestore(item)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => openPermanentDelete(item)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setItemTarget(null);
        }}
        onConfirm={handleRestore}
        title="Pulihkan Data"
        message="Yakin ingin memulihkan item ini? Data akan kembali ke halaman inventory aktif."
        itemName={itemTarget?.item_name}
        confirmLabel={actionLoading ? "Memulihkan..." : "Restore"}
        successTitle="Data berhasil dipulihkan"
      />

      <ConfirmModal
        isOpen={isPermanentDeleteModalOpen}
        onClose={() => {
          setIsPermanentDeleteModalOpen(false);
          setItemTarget(null);
        }}
        onConfirm={handlePermanentDelete}
        title="Hapus Permanen"
        message="Yakin ingin menghapus item ini secara permanen? Data akan hilang selamanya dan tidak dapat dipulihkan."
        itemName={itemTarget?.item_name}
        danger
        confirmLabel={actionLoading ? "Menghapus..." : "Hapus Permanen"}
        successTitle="Data dihapus permanen"
      />
    </div>
  );
}