import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Package, CheckCircle, FileText, AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import Card from "../components/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";

type InventoryStatus = "Available" | "In Use" | "Maintenance";
type LoanStatus = "Borrowed" | "Returned" | "Overdue";

type InventoryApiItem = {
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
  user_email?: string;
  item_name?: string;
  category?: string;
  item_status?: string;
};

type DashboardLoan = LoanApiItem & {
  displayStatus: LoanStatus;
};

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  message?: string;
};

type MonthlyLoanData = {
  id: number;
  month: string;
  loans: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555";

const toDateOnly = (value?: string | null) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

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
  });
};

const getStatusClassName = (status: LoanStatus) => {
  if (status === "Borrowed") {
    return "bg-yellow-100 text-yellow-700 border-yellow-300";
  }

  if (status === "Overdue") {
    return "bg-red-100 text-red-700 border-red-300";
  }

  return "bg-green-100 text-green-700 border-green-300";
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

const buildLastSixMonths = () => {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    };
  });
};

const resolveLoanStatus = (loan: LoanApiItem, todayString: string): LoanStatus => {
  const dueDate = toDateOnly(loan.due_date);

  if (loan.status === "Borrowed" && dueDate && dueDate < todayString) {
    return "Overdue";
  }

  return loan.status;
};

export default function DashboardPage() {
  const { token, user } = useAuth();

  const [inventory, setInventory] = useState<InventoryApiItem[]>([]);
  const [loans, setLoans] = useState<LoanApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayString = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const authHeaders = useMemo(() => {
    if (!token) return undefined;

    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const fetchDashboardData = useCallback(async () => {
    if (!token || !authHeaders) {
      setError("Token tidak tersedia. Silakan login ulang.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [inventoryResponse, loansResponse] = await Promise.all([
        axios.get<ApiListResponse<InventoryApiItem>>(`${API_BASE_URL}/api/inventory`, {
          headers: authHeaders,
        }),
        axios.get<ApiListResponse<LoanApiItem>>(`${API_BASE_URL}/api/loans`, {
          headers: authHeaders,
        }),
      ]);

      setInventory(inventoryResponse.data.data ?? []);
      setLoans(loansResponse.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Gagal mengambil data dashboard"));
      setInventory([]);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const displayLoans = useMemo<DashboardLoan[]>(() => {
    return loans.map((loan) => ({
      ...loan,
      displayStatus: resolveLoanStatus(loan, todayString),
    }));
  }, [loans, todayString]);

  const activeInventory = useMemo(() => {
    return inventory.filter((item) => !item.deleted_at);
  }, [inventory]);

  const dashboardStats = useMemo(() => {
    const totalItems = activeInventory.reduce(
      (sum, item) => sum + Number(item.total_stock || 0),
      0
    );

    const availableItems = activeInventory.reduce(
      (sum, item) => sum + Number(item.available_stock || 0),
      0
    );

    const activeLoans = displayLoans.filter(
      (loan) => loan.displayStatus === "Borrowed" || loan.displayStatus === "Overdue"
    ).length;

    const maintenanceItems = activeInventory.filter((item) => item.status === "Maintenance").length;

    const availabilityPercentage =
      totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0;

    return {
      totalItems,
      availableItems,
      activeLoans,
      maintenanceItems,
      availabilityPercentage,
      itemTypes: activeInventory.length,
      loanRecords: displayLoans.length,
    };
  }, [activeInventory, displayLoans]);

  const loanActivityData = useMemo<MonthlyLoanData[]>(() => {
    const months = buildLastSixMonths();

    return months.map((month, index) => {
      const count = displayLoans.filter((loan) => {
        if (!loan.borrow_date) return false;

        const date = new Date(loan.borrow_date);

        if (Number.isNaN(date.getTime())) return false;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        return key === month.key;
      }).length;

      return {
        id: index + 1,
        month: month.label,
        loans: count,
      };
    });
  }, [displayLoans]);

  const recentLoans = useMemo(() => {
    return [...displayLoans]
      .sort((a, b) => {
        const dateA = new Date(a.borrow_date).getTime();
        const dateB = new Date(b.borrow_date).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [displayLoans]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-muted-foreground">Mengambil data dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div>
          <h1 className="text-xl font-semibold text-slate-800">Gagal memuat dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
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
      <div>
        <h1 className="text-3xl mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome{user?.full_name ? `, ${user.full_name}` : ""} to Smart Inventory Laboratory IoT
          System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Items"
          value={String(dashboardStats.totalItems)}
          icon={Package}
          trend={`${dashboardStats.itemTypes} item types`}
          trendUp
          color="blue"
        />

        <Card
          title="Available Items"
          value={String(dashboardStats.availableItems)}
          icon={CheckCircle}
          trend={`${dashboardStats.availabilityPercentage}% available`}
          trendUp={dashboardStats.availableItems > 0}
          color="green"
        />

        <Card
          title="Active Loans"
          value={String(dashboardStats.activeLoans)}
          icon={FileText}
          trend={`${dashboardStats.loanRecords} total loan records`}
          trendUp={dashboardStats.activeLoans > 0}
          color="amber"
        />

        <Card
          title="Maintenance Items"
          value={String(dashboardStats.maintenanceItems)}
          icon={AlertTriangle}
          trend="Need attention"
          trendUp={false}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border-2 border-border rounded-lg p-6 shadow-sm">
          <h2 className="mb-4">Loan Activity (Last 6 Months)</h2>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={loanActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe6e9" />
              <XAxis
                dataKey="month"
                stroke="#7f8c8d"
                style={{ fontSize: "12px" }}
                tickLine={false}
              />
              <YAxis stroke="#7f8c8d" style={{ fontSize: "12px" }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "2px solid #3498db",
                  borderRadius: "8px",
                }}
                cursor={{ fill: "rgba(52, 152, 219, 0.1)" }}
              />
              <Bar dataKey="loans" fill="#3498db" radius={[6, 6, 0, 0]} animationDuration={500} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border-2 border-border rounded-lg p-6 shadow-sm">
          <h2 className="mb-4">Loan Trend</h2>

          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={loanActivityData}>
              <defs>
                <linearGradient id="gradient-area-loan-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498db" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe6e9" />
              <XAxis
                dataKey="month"
                stroke="#7f8c8d"
                style={{ fontSize: "12px" }}
                tickLine={false}
              />
              <YAxis stroke="#7f8c8d" style={{ fontSize: "12px" }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "2px solid #3498db",
                  borderRadius: "8px",
                }}
                cursor={{ stroke: "#3498db", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="loans"
                stroke="#3498db"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#gradient-area-loan-trend)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        <div className="p-6 border-b-2 border-border">
          <h2>Recent Activity (Last 5 Transactions)</h2>
        </div>

        {recentLoans.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Belum ada transaksi peminjaman.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/80">
                <tr>
                  <th className="text-left px-6 py-3.5 text-sm">Student Name</th>
                  <th className="text-left px-6 py-3.5 text-sm">Item Name</th>
                  <th className="text-left px-6 py-3.5 text-sm">Borrow Date</th>
                  <th className="text-left px-6 py-3.5 text-sm">Due Date</th>
                  <th className="text-left px-6 py-3.5 text-sm">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {recentLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      {loan.user_full_name ?? loan.full_name ?? "Unknown Student"}
                    </td>

                    <td className="px-6 py-4">{loan.item_name ?? "Unknown Item"}</td>

                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {formatDate(loan.borrow_date)}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {formatDate(loan.due_date)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium ${getStatusClassName(
                          loan.displayStatus
                        )}`}
                      >
                        {loan.displayStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}