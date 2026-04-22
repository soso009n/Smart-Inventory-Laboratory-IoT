import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";

interface Loan {
  id: number;
  studentName: string;
  itemName: string;
  borrowDate: string;
  dueDate: string;
  status: "Borrowed" | "Returned" | "Overdue";
}

const mockLoans: Loan[] = [
  { id: 1, studentName: "Ahmad Fauzi", itemName: "Arduino Uno R3", borrowDate: "2026-04-20", dueDate: "2026-04-27", status: "Borrowed" },
  { id: 2, studentName: "Siti Rahma", itemName: "Raspberry Pi 4", borrowDate: "2026-04-19", dueDate: "2026-04-26", status: "Borrowed" },
  { id: 3, studentName: "Budi Santoso", itemName: "ESP32 Dev Board", borrowDate: "2026-04-18", dueDate: "2026-04-22", status: "Overdue" },
  { id: 4, studentName: "Dewi Lestari", itemName: "DHT22 Sensor", borrowDate: "2026-04-21", dueDate: "2026-04-28", status: "Borrowed" },
  { id: 5, studentName: "Eko Prasetyo", itemName: "OLED Display 128x64", borrowDate: "2026-04-17", dueDate: "2026-04-21", status: "Returned" },
  { id: 6, studentName: "Fatimah Zahra", itemName: "HC-SR04 Sensor", borrowDate: "2026-04-16", dueDate: "2026-04-23", status: "Borrowed" },
  { id: 7, studentName: "Gunawan Wijaya", itemName: "NodeMCU ESP8266", borrowDate: "2026-04-15", dueDate: "2026-04-20", status: "Overdue" },
  { id: 8, studentName: "Hani Putri", itemName: "Servo Motor SG90", borrowDate: "2026-04-14", dueDate: "2026-04-19", status: "Returned" },
];

type LoanForm = {
  studentName: string;
  itemName: string;
  borrowDate: string;
  dueDate: string;
};

const emptyLoan: LoanForm = { studentName: "", itemName: "", borrowDate: "", dueDate: "" };

const loanFields: GlassField<LoanForm>[] = [
  { key: "studentName", label: "Nama Student", type: "text", required: true, placeholder: "Contoh: Ahmad Fauzi", colSpan: 2,
    validate: (v) => (String(v).trim().length < 3 ? "Minimal 3 karakter" : null) },
  { key: "itemName", label: "Nama Alat", type: "text", required: true, placeholder: "Contoh: Arduino Uno R3", colSpan: 2 },
  { key: "borrowDate", label: "Tanggal Pinjam", type: "date", required: true, colSpan: 1 },
  { key: "dueDate", label: "Tanggal Kembali", type: "date", required: true, colSpan: 1,
    validate: (v, all) =>
      all.borrowDate && v && String(v) < String(all.borrowDate) ? "Tidak boleh sebelum tanggal pinjam" : null },
];

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>(mockLoans);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddLoan = (data: LoanForm) => {
    setLoans([...loans, { id: Date.now(), ...data, status: "Borrowed" }]);
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLoans.map((loan) => (
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
                </tr>
              ))}
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
