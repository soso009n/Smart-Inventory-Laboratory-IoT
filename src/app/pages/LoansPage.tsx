import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, Undo2 } from "lucide-react";
import axios from "axios";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555/api";

interface Loan {
  id: number;
  studentName: string;
  itemName: string;
  borrowDate: string;
  dueDate: string;
  status: "Borrowed" | "Returned" | "Overdue";
}

type LoanForm = {
  userId?: number | string;
  itemId: number | string;
  dueDate: string;
};

const emptyLoan: LoanForm = { userId: "", itemId: "", dueDate: "" };

type LoanApiItem = {
  id: number;
  user_id: number;
  item_id: number;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  user_full_name?: string;
  item_name?: string;
};

type InventoryOption = {
  id: number;
  name: string;
  available: number;
  status: string;
};

type InventoryApiItem = {
  id: number;
  item_name: string;
  available_stock: number;
  status: string;
};

type StudentOption = {
  id: number;
  full_name: string;
  role: "admin" | "student";
  is_active: boolean;
};

export default function LoansPage() {
  const { token, user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const todayString = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const authHeaders = useMemo(
    () => ({
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );

  const fetchLoans = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/loans`, { headers: authHeaders });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped = (data as LoanApiItem[]).map((loan) => {
        const dueDate = loan.due_date?.slice(0, 10) ?? "";
        const borrowDate = loan.borrow_date?.slice(0, 10) ?? "";
        const isOverdue = loan.status === "Borrowed" && dueDate && dueDate < todayString;
        return {
          id: loan.id,
          studentName: loan.user_full_name ?? `User #${loan.user_id}`,
          itemName: loan.item_name ?? `Item #${loan.item_id}`,
          borrowDate,
          dueDate,
          status: isOverdue ? "Overdue" : (loan.status as Loan["status"]),
        };
      });
      setLoans(mapped);
    } catch (error) {
      console.error("Gagal mengambil data loans:", error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token, todayString]);

  const fetchInventory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/inventory`, { headers: authHeaders });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const options = (data as InventoryApiItem[]).map((item) => ({
        id: item.id,
        name: item.item_name,
        available: Number(item.available_stock),
        status: item.status,
      }));
      setInventoryOptions(options);
    } catch (error) {
      console.error("Gagal mengambil inventory untuk loan:", error);
      setInventoryOptions([]);
    }
  }, [authHeaders, token]);

  const fetchStudents = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/users`, { headers: authHeaders });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setStudents(data.filter((row: StudentOption) => row.role === "student"));
    } catch (error) {
      console.error("Gagal mengambil data user:", error);
      setStudents([]);
    }
  }, [authHeaders, isAdmin, token]);

  useEffect(() => {
    fetchLoans();
    fetchInventory();
    fetchStudents();
  }, [fetchLoans, fetchInventory, fetchStudents]);

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
  }, [inventoryOptions, students, isAdmin]);

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddLoan = async (data: LoanForm) => {
    if (!token) return;
    try {
      if (isAdmin && !data.userId) {
        alert("Pilih student terlebih dahulu.");
        return;
      }

      const payload: Record<string, any> = {
        item_id: Number(data.itemId),
        due_date: data.dueDate,
      };
      if (isAdmin) {
        payload.user_id = Number(data.userId);
      }

      await axios.post(`${API_BASE_URL}/loans`, payload, { headers: authHeaders });
      await fetchLoans();
    } catch (error: any) {
      console.error("Gagal menambah loan:", error);
      alert(error.response?.data?.message || "Gagal menambah loan");
    }
  };

  const handleReturnLoan = async (loanId: number) => {
    if (!token) return;
    try {
      await axios.patch(`${API_BASE_URL}/loans/${loanId}/return`, {}, { headers: authHeaders });
      await fetchLoans();
    } catch (error: any) {
      console.error("Gagal mengembalikan loan:", error);
      alert(error.response?.data?.message || "Gagal mengembalikan loan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Loan Management</h1>
          <p className="text-muted-foreground">Track equipment loans and returns</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Loan
        </button>
      </div>

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        <div className="p-4 border-b-2 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-muted-foreground">
                    Memuat data loan...
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
                      {loan.status === "Borrowed" && (
                        <button
                          onClick={() => handleReturnLoan(loan.id)}
                          className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
                        >
                          <Undo2 className="w-4 h-4" />
                          Return
                        </button>
                      )}
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
        submitLabel="Tambah Loan"
      />
    </div>
  );
}
