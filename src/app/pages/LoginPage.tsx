import { useEffect, useState } from "react";
import { Package, CheckCircle, FileText, AlertTriangle, Loader2 } from "lucide-react";
import Card from "../components/Card";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const [recentLoans, setRecentLoans] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, available: 0, activeLoans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Ambil data peminjaman dari JOIN 3 Tabel di Backend
      const loanRes = await axios.get("http://localhost:5555/api/loans");
      setRecentLoans(loanRes.data.data.slice(0, 5)); // Ambil 5 data terakhir

      // Ambil data inventory untuk stats
      const invRes = await axios.get("http://localhost:5555/api/inventory");
      const items = invRes.data.data;
      
      setStats({
        totalItems: items.length,
        available: items.filter((i: any) => i.status === 'Available').length,
        activeLoans: loanRes.data.data.filter((l: any) => l.status_pinjaman === 'Borrowed').length
      });
    } catch (err) {
      console.error("Gagal ambil data dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <p className="text-slate-500 font-medium">Sinkronisasi Data Neon...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500">Real-time status dari Database Neon Cloud</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Items" value={stats.totalItems.toString()} icon={Package} color="blue" />
        <Card title="Available Items" value={stats.available.toString()} icon={CheckCircle} color="green" />
        <Card title="Active Loans" value={stats.activeLoans.toString()} icon={FileText} color="amber" />
        <Card title="System Status" value="Online" icon={CheckCircle} color="blue" />
      </div>

      {/* Recent Activity Table (Hasil JOIN 3 Tabel) */}
      <div className="bg-white border-2 border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b-2 border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-700">Aktivitas Peminjaman Terakhir (Data JOIN)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600">
            <thead className="bg-slate-100/80 font-bold text-slate-700 uppercase text-xs">
              <tr>
                <th className="text-left px-6 py-4">Praktikan</th>
                <th className="text-left px-6 py-4">Nama Alat</th>
                <th className="text-left px-6 py-4">Kategori</th>
                <th className="text-left px-6 py-4">Tenggat</th>
                <th className="text-left px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLoans.map((loan: any) => (
                <tr key={loan.id_peminjaman} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{loan.nama_praktikan}</td>
                  <td className="px-6 py-4">{loan.nama_alat}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-[10px]">{loan.kategori}</span></td>
                  <td className="px-6 py-4 text-slate-500">{new Date(loan.tenggat_waktu).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      loan.status_pinjaman === "Borrowed" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-green-50 text-green-600 border-green-200"
                    }`}>
                      {loan.status_pinjaman}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}