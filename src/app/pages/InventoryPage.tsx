import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit2, Trash2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555/api";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  status: "Available" | "In Use" | "Maintenance";
  totalStock: number;
  availableStock: number;
  deleted: boolean;
}

type InventoryForm = Omit<InventoryItem, "id" | "deleted">;

interface InventoryApiItem {
  id: number;
  item_name: string;
  category: string;
  status: "Available" | "In Use" | "Maintenance";
  total_stock: number;
  available_stock: number;
  deleted_at?: string | null;
}

const emptyForm: InventoryForm = {
  name: "",
  category: "",
  status: "Available",
  totalStock: 0,
  availableStock: 0,
};

const inventoryFields: GlassField<InventoryForm>[] = [
  { key: "name", label: "Nama Alat", type: "text", required: true, placeholder: "Contoh: Arduino Uno R3", colSpan: 2,
    validate: (v) => (String(v).trim().length < 2 ? "Minimal 2 karakter" : null) },
  { key: "category", label: "Kategori", type: "text", required: true, placeholder: "Microcontroller / Sensor / ...", colSpan: 2 },
  { key: "status", label: "Status", type: "select", required: true, colSpan: 2,
    options: [
      { value: "Available", label: "Available" },
      { value: "In Use", label: "In Use" },
      { value: "Maintenance", label: "Maintenance" },
    ] },
  { key: "totalStock", label: "Total Stock", type: "number", required: true, colSpan: 1,
    validate: (v) => (Number(v) < 0 ? "Tidak boleh negatif" : null) },
  { key: "availableStock", label: "Available Stock", type: "number", required: true, colSpan: 1,
    validate: (v, all) =>
      Number(v) < 0 ? "Tidak boleh negatif" : Number(v) > Number(all.totalStock) ? "Melebihi total stock" : null },
];

export default function InventoryPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const authHeaders = useMemo(
    () => ({
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );

  const mapApiItem = (item: InventoryApiItem): InventoryItem => ({
    id: item.id,
    name: item.item_name,
    category: item.category,
    status: item.status ?? "Available",
    totalStock: Number(item.total_stock),
    availableStock: Number(item.available_stock),
    deleted: Boolean(item.deleted_at),
  });

  const fetchItems = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/inventory`, {
        headers: authHeaders,
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setItems(data.map(mapApiItem));
    } catch (error) {
      console.error("Gagal mengambil data inventory:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [authHeaders]);

  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];

  const filteredItems = items
    .filter((item) => !item.deleted)
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAdd = async (data: InventoryForm) => {
    if (!token) return;
    try {
      const payload = {
        item_name: data.name,
        category: data.category,
        status: data.status,
        total_stock: data.totalStock,
        available_stock: data.availableStock,
      };
      await axios.post(`${API_BASE_URL}/inventory`, payload, { headers: authHeaders });
      await fetchItems();
    } catch (error: any) {
      console.error("Gagal menambah inventory:", error);
      alert(error.response?.data?.message || "Gagal menambah inventory");
    }
  };

  const handleEdit = async (data: InventoryForm) => {
    if (!token || !currentItem) return;
    try {
      const payload = {
        item_name: data.name,
        category: data.category,
        status: data.status,
        total_stock: data.totalStock,
        available_stock: data.availableStock,
      };
      await axios.put(`${API_BASE_URL}/inventory/${currentItem.id}`, payload, { headers: authHeaders });
      await fetchItems();
    } catch (error: any) {
      console.error("Gagal update inventory:", error);
      alert(error.response?.data?.message || "Gagal update inventory");
    }
  };

  const handleDeleteItem = async () => {
    if (!token || !currentItem) return;
    try {
      await axios.delete(`${API_BASE_URL}/inventory/${currentItem.id}`, { headers: authHeaders });
      await fetchItems();
      setCurrentItem(null);
    } catch (error: any) {
      console.error("Gagal menghapus inventory:", error);
      alert(error.response?.data?.message || "Gagal menghapus inventory");
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
            className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        )}
      </div>

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        <div className="p-4 border-b-2 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-6 text-center text-muted-foreground">
                    Memuat data inventory...
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
                          item.status === "Available" ? "success" : item.status === "In Use" ? "info" : "warning"
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
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
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
            Showing {paginatedItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border-2 border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm px-4 py-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
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
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteItem}
          title="Pindahkan ke Trash"
          message="Yakin ingin memindahkan item ini ke trash? Data masih bisa dipulihkan dari halaman Trash."
          itemName={currentItem?.name}
          confirmLabel="Pindahkan ke Trash"
          successTitle="Item dipindahkan ke trash"
        />
      )}

    </div>
  );
}
