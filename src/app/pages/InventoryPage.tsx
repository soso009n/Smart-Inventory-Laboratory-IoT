import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import axios from "axios";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555";

type InventoryStatus = "Available" | "In Use" | "Maintenance";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  status: InventoryStatus;
  totalStock: number;
  availableStock: number;
  deleted: boolean;
}

type InventoryForm = Omit<InventoryItem, "id" | "deleted">;

interface InventoryApiItem {
  id: number;
  item_name: string;
  category: string;
  status: InventoryStatus;
  total_stock: number;
  available_stock: number;
  deleted_at?: string | null;
}

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  message?: string;
};

type ApiItemResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const emptyForm: InventoryForm = {
  name: "",
  category: "",
  status: "Available",
  totalStock: 0,
  availableStock: 0,
};

const inventoryFields: GlassField<InventoryForm>[] = [
  {
    key: "name",
    label: "Nama Alat",
    type: "text",
    required: true,
    placeholder: "Contoh: Arduino Uno R3",
    colSpan: 2,
    validate: (value) => (String(value).trim().length < 2 ? "Minimal 2 karakter" : null),
  },
  {
    key: "category",
    label: "Kategori",
    type: "text",
    required: true,
    placeholder: "Microcontroller / Sensor / ...",
    colSpan: 2,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    colSpan: 2,
    options: [
      { value: "Available", label: "Available" },
      { value: "In Use", label: "In Use" },
      { value: "Maintenance", label: "Maintenance" },
    ],
  },
  {
    key: "totalStock",
    label: "Total Stock",
    type: "number",
    required: true,
    colSpan: 1,
    validate: (value) => (Number(value) < 0 ? "Tidak boleh negatif" : null),
  },
  {
    key: "availableStock",
    label: "Available Stock",
    type: "number",
    required: true,
    colSpan: 1,
    validate: (value, all) =>
      Number(value) < 0
        ? "Tidak boleh negatif"
        : Number(value) > Number(all.totalStock)
        ? "Melebihi total stock"
        : null,
  },
];

const mapApiItem = (item: InventoryApiItem): InventoryItem => ({
  id: item.id,
  name: item.item_name,
  category: item.category,
  status: item.status ?? "Available",
  totalStock: Number(item.total_stock),
  availableStock: Number(item.available_stock),
  deleted: Boolean(item.deleted_at),
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export default function InventoryPage() {
  const { token, user } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isAdmin = user?.role === "admin";

  const authHeaders = useMemo(() => {
    if (!token) return undefined;

    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const fetchItems = useCallback(async () => {
    if (!token || !authHeaders) {
      setError("Token tidak tersedia. Silakan login ulang.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<ApiListResponse<InventoryApiItem>>(
        `${API_BASE_URL}/api/inventory`,
        {
          headers: authHeaders,
        }
      );

      setItems((response.data.data ?? []).map(mapApiItem));
    } catch (err) {
      setError(getErrorMessage(err, "Gagal mengambil data inventory"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.filter((item) => !item.deleted).map((item) => item.category)))],
    [items]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => !item.deleted)
      .filter((item) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(q);
        const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
        const matchesStatus = statusFilter === "All" || item.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
      });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const buildPayload = (data: InventoryForm) => ({
    item_name: data.name.trim(),
    category: data.category.trim(),
    status: data.status,
    total_stock: Number(data.totalStock),
    available_stock: Number(data.availableStock),
  });

  const handleAdd = async (data: InventoryForm) => {
    if (!authHeaders) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.post<ApiItemResponse<InventoryApiItem>>(
        `${API_BASE_URL}/api/inventory`,
        buildPayload(data),
        {
          headers: authHeaders,
        }
      );

      await fetchItems();
      setIsAddModalOpen(false);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal menambah inventory");
      setError(message);
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (data: InventoryForm) => {
    if (!authHeaders || !currentItem) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.put<ApiItemResponse<InventoryApiItem>>(
        `${API_BASE_URL}/api/inventory/${currentItem.id}`,
        buildPayload(data),
        {
          headers: authHeaders,
        }
      );

      await fetchItems();
      setIsEditModalOpen(false);
      setCurrentItem(null);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal update inventory");
      setError(message);
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!authHeaders || !currentItem) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.delete<ApiItemResponse<InventoryApiItem>>(
        `${API_BASE_URL}/api/inventory/${currentItem.id}`,
        {
          headers: authHeaders,
        }
      );

      await fetchItems();
      setIsDeleteModalOpen(false);
      setCurrentItem(null);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal menghapus inventory");
      setError(message);
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setCurrentItem(item);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (item: InventoryItem) => {
    setCurrentItem(item);
    setIsDeleteModalOpen(true);
  };

  const currentFormData: InventoryForm = currentItem
    ? {
        name: currentItem.name,
        category: currentItem.category,
        status: currentItem.status,
        totalStock: currentItem.totalStock,
        availableStock: currentItem.availableStock,
      }
    : emptyForm;

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground">Mengambil data inventory...</p>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Gagal memuat inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Manage laboratory equipment and components</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        <div className="p-4 border-b-2 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="pl-9 pr-8 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="px-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All Status</option>
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-6 py-3 text-sm">Item Name</th>
                <th className="text-left px-6 py-3 text-sm">Category</th>
                <th className="text-left px-6 py-3 text-sm">Status</th>
                <th className="text-left px-6 py-3 text-sm">Total Stock</th>
                <th className="text-left px-6 py-3 text-sm">Available Stock</th>
                {isAdmin && <th className="text-left px-6 py-3 text-sm">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    Tidak ada data inventory.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.category}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          item.status === "Available"
                            ? "success"
                            : item.status === "In Use"
                            ? "info"
                            : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{item.totalStock}</td>
                    <td className="px-6 py-4">{item.availableStock}</td>

                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            disabled={actionLoading}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Edit inventory"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            disabled={actionLoading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Pindahkan ke Trash"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t-2 border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}{" "}
            items
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="p-2 border-2 border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm px-4 py-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages || 1, page + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="p-2 border-2 border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {isAdmin && (
        <GlassFormModal<InventoryForm>
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          mode="create"
          title="Tambah Inventory"
          fields={inventoryFields}
          initial={emptyForm}
          onSubmit={handleAdd}
        />
      )}

      {isAdmin && (
        <GlassFormModal<InventoryForm>
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentItem(null);
          }}
          mode="edit"
          title="Edit Inventory"
          fields={inventoryFields}
          initial={currentFormData}
          original={currentItem ? currentFormData : null}
          onSubmit={handleEdit}
        />
      )}

      {isAdmin && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setCurrentItem(null);
          }}
          onConfirm={handleDeleteItem}
          title="Pindahkan ke Trash"
          message="Yakin ingin memindahkan item ini ke trash? Data masih bisa dipulihkan dari halaman Trash."
          itemName={currentItem?.name}
          confirmLabel={actionLoading ? "Memindahkan..." : "Pindahkan ke Trash"}
          successTitle="Item dipindahkan ke trash"
        />
      )}
    </div>
  );
}