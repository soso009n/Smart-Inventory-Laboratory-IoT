import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Undo2,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import axios from "axios";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555";

type LoanStatus = "Borrowed" | "Returned" | "Overdue";

interface Loan {
  id: number;
  studentName: string;
  itemName: string;
  borrowDate: string;
  dueDate: string;
  status: LoanStatus;
}

type LoanForm = {
  userId?: number | string;
  itemId: number | string;
  dueDate: string;
};

const emptyLoan: LoanForm = {
  userId: "",
  itemId: "",
  dueDate: "",
};

type LoanApiItem = {
  id: number;
  user_id: number;
  item_id: number;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: LoanStatus;
  user_full_name?: string;
  full_name?: string;
  item_name?: string;
};

type InventoryApiItem = {
  id: number;
  item_name: string;
  available_stock: number;
  status: "Available" | "In Use" | "Maintenance";
  deleted_at?: string | null;
};

type InventoryOption = {
  id: number;
  name: string;
  available: number;
  status: "Available" | "In Use" | "Maintenance";
};

type StudentOption = {
  id: number;
  full_name: string;
  role: "admin" | "student";
  is_active: boolean;
};

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

const toDateOnly = (value?: string | null) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

export default function LoansPage() {
  const { token, user } = useAuth();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const isAdmin = user?.role === "admin";
  const todayString = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const authHeaders = useMemo(() => {
    if (!token) return undefined;

    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const mapLoan = useCallback(
    (loan: LoanApiItem): Loan => {
      const dueDate = toDateOnly(loan.due_date);
      const borrowDate = toDateOnly(loan.borrow_date);
      const isOverdue = loan.status === "Borrowed" && dueDate && dueDate < todayString;

      return {
        id: loan.id,
        studentName: loan.user_full_name ?? loan.full_name ?? `User #${loan.user_id}`,
        itemName: loan.item_name ?? `Item #${loan.item_id}`,
        borrowDate,
        dueDate,
        status: isOverdue ? "Overdue" : loan.status,
      };
    },
    [todayString]
  );

  const fetchLoans = useCallback(async () => {
    if (!token || !authHeaders) {
      setError("Token tidak tersedia. Silakan login ulang.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<ApiListResponse<LoanApiItem>>(`${API_BASE_URL}/api/loans`, {
        headers: authHeaders,
      });

      setLoans((response.data.data ?? []).map(mapLoan));
    } catch (err) {
      setLoans([]);
      setError(getErrorMessage(err, "Gagal mengambil data loans"));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, mapLoan, token]);

  const fetchInventory = useCallback(async () => {
    if (!token || !authHeaders) return;

    try {
      const response = await axios.get<ApiListResponse<InventoryApiItem>>(
        `${API_BASE_URL}/api/inventory`,
        {
          headers: authHeaders,
        }
      );

      const options = (response.data.data ?? [])
        .filter((item) => !item.deleted_at)
        .map((item) => ({
          id: item.id,
          name: item.item_name,
          available: Number(item.available_stock),
          status: item.status,
        }));

      setInventoryOptions(options);
    } catch (err) {
      setInventoryOptions([]);
      setError(getErrorMessage(err, "Gagal mengambil inventory untuk loan"));
    }
  }, [authHeaders, token]);

  const fetchStudents = useCallback(async () => {
    if (!token || !authHeaders || !isAdmin) {
      setStudents([]);
      return;
    }

    try {
      const response = await axios.get<ApiListResponse<StudentOption>>(`${API_BASE_URL}/api/users`, {
        headers: authHeaders,
      });

      setStudents(
        (response.data.data ?? []).filter(
          (student) => student.role === "student" && student.is_active
        )
      );
    } catch (err) {
      setStudents([]);
      setError(getErrorMessage(err, "Gagal mengambil data student"));
    }
  }, [authHeaders, isAdmin, token]);

  const fetchPageData = useCallback(async () => {
    await Promise.all([fetchLoans(), fetchInventory(), fetchStudents()]);
  }, [fetchLoans, fetchInventory, fetchStudents]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const loanFields: GlassField<LoanForm>[] = useMemo(() => {
    const itemOptions = inventoryOptions
      .filter((item) => item.available > 0 && item.status !== "Maintenance")
      .map((item) => ({
        value: item.id,
        label: `${item.name} (stok ${item.available})`,
      }));

    const fields: GlassField<LoanForm>[] = [
      {
        key: "itemId",
        label: "Nama Alat",
        type: "select",
        required: true,
        colSpan: 2,
        options: [{ value: "", label: "Pilih item" }, ...itemOptions],
      },
      {
        key: "dueDate",
        label: "Tanggal Kembali",
        type: "date",
        required: true,
        colSpan: 2,
        validate: (value) => (!value ? "Tanggal kembali wajib diisi" : null),
      },
    ];

    if (isAdmin) {
      const studentOptions = students.map((student) => ({
        value: student.id,
        label: student.full_name,
      }));

      fields.unshift({
        key: "userId",
        label: "Nama Student",
        type: "select",
        required: true,
        colSpan: 2,
        options: [{ value: "", label: "Pilih student" }, ...studentOptions],
      });
    }

    return fields;
  }, [inventoryOptions, isAdmin, students]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const q = searchTerm.toLowerCase();

      const matchesSearch =
        loan.studentName.toLowerCase().includes(q) || loan.itemName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || loan.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [loans, searchTerm, statusFilter]);

  const handleAddLoan = async (data: LoanForm) => {
    if (!authHeaders) return;

    if (!data.itemId) {
      alert("Pilih item terlebih dahulu.");
      return;
    }

    if (!data.dueDate) {
      alert("Tanggal kembali wajib diisi.");
      return;
    }

    if (isAdmin && !data.userId) {
      alert("Pilih student terlebih dahulu.");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const payload: {
        item_id: number;
        due_date: string;
        user_id?: number;
      } = {
        item_id: Number(data.itemId),
        due_date: data.dueDate,
      };

      if (isAdmin) {
        payload.user_id = Number(data.userId);
      }

      await axios.post<ApiItemResponse<LoanApiItem>>(`${API_BASE_URL}/api/loans`, payload, {
        headers: authHeaders,
      });

      await fetchPageData();
      setIsAddModalOpen(false);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal menambah loan");
      setError(message);
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnLoan = async (loanId: number) => {
    if (!authHeaders) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.patch<ApiItemResponse<LoanApiItem>>(
        `${API_BASE_URL}/api/loans/${loanId}/return`,
        {},
        {
          headers: authHeaders,
        }
      );

      await fetchPageData();
    } catch (err) {
      const message = getErrorMessage(err, "Gagal mengembalikan loan");
      setError(message);
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteLoan = async () => {
    if (!authHeaders || !selectedLoan) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.delete<ApiItemResponse<LoanApiItem>>(
        `${API_BASE_URL}/api/loans/${selectedLoan.id}`,
        {
          headers: authHeaders,
        }
      );

      await fetchPageData();
      setIsDeleteModalOpen(false);
      setSelectedLoan(null);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal menghapus loan");
      setError(message);
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground">Mengambil data loan...</p>
      </div>
    );
  }

  if (error && loans.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Gagal memuat loan</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={fetchPageData}
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
          <h1 className="text-3xl mb-2">Loan Management</h1>
          <p className="text-muted-foreground">Track equipment loans and returns</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={actionLoading}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="w-5 h-5" />
          Add Loan
        </button>
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
                placeholder="Search by student or item name..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="pl-9 pr-8 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                <option value="All">All Status</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Returned">Returned</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-6 py-3 text-sm">Student Name</th>
                <th className="text-left px-6 py-3 text-sm">Item Name</th>
                <th className="text-left px-6 py-3 text-sm">Borrow Date</th>
                <th className="text-left px-6 py-3 text-sm">Due Date</th>
                <th className="text-left px-6 py-3 text-sm">Status</th>
                <th className="text-left px-6 py-3 text-sm">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    Tidak ada data loan.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">{loan.studentName}</td>
                    <td className="px-6 py-4">{loan.itemName}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{loan.borrowDate}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{loan.dueDate}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          loan.status === "Borrowed"
                            ? "info"
                            : loan.status === "Returned"
                            ? "success"
                            : "danger"
                        }
                      >
                        {loan.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {(loan.status === "Borrowed" || loan.status === "Overdue") && (
                          <button
                            onClick={() => handleReturnLoan(loan.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 rounded px-2 py-1 text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Undo2 className="w-4 h-4" />
                            Return
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => openDeleteModal(loan)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GlassFormModal<LoanForm>
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="create"
        title="Tambah Loan"
        fields={loanFields}
        initial={emptyLoan}
        onSubmit={handleAddLoan}
        submitLabel={actionLoading ? "Menyimpan..." : "Tambah Loan"}
      />

      {isAdmin && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedLoan(null);
          }}
          onConfirm={handleDeleteLoan}
          title="Hapus Loan"
          message="Yakin ingin menghapus data loan ini? Data akan dipindahkan ke arsip/soft delete."
          itemName={
            selectedLoan
              ? `${selectedLoan.studentName} - ${selectedLoan.itemName}`
              : undefined
          }
          danger
          confirmLabel={actionLoading ? "Menghapus..." : "Ya, Hapus"}
          successTitle="Loan berhasil dihapus"
        />
      )}
    </div>
  );
}