import { Package, CheckCircle, FileText, AlertTriangle } from "lucide-react";
import Card from "../components/Card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const loanActivityData = [
  { id: 1, month: "Jan", loans: 45 },
  { id: 2, month: "Feb", loans: 52 },
  { id: 3, month: "Mar", loans: 48 },
  { id: 4, month: "Apr", loans: 61 },
  { id: 5, month: "May", loans: 55 },
  { id: 6, month: "Jun", loans: 67 },
];

const recentLoans = [
  { id: 1, student: "Ahmad Fauzi", item: "Arduino Uno R3", borrowDate: "2026-04-20", dueDate: "2026-04-27", status: "Borrowed" },
  { id: 2, student: "Siti Rahma", item: "Raspberry Pi 4", borrowDate: "2026-04-19", dueDate: "2026-04-26", status: "Borrowed" },
  { id: 3, student: "Budi Santoso", item: "ESP32 Dev Board", borrowDate: "2026-04-18", dueDate: "2026-04-22", status: "Overdue" },
  { id: 4, student: "Dewi Lestari", item: "DHT22 Sensor", borrowDate: "2026-04-21", dueDate: "2026-04-28", status: "Borrowed" },
  { id: 5, student: "Eko Prasetyo", item: "OLED Display 128x64", borrowDate: "2026-04-17", dueDate: "2026-04-21", status: "Returned" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome to Smart Inventory Laboratory IoT System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Items" value="156" icon={Package} trend="+12 this month" trendUp color="blue" />
        <Card title="Available Items" value="98" icon={CheckCircle} trend="63% available" trendUp color="green" />
        <Card title="Active Loans" value="42" icon={FileText} trend="+8 this week" trendUp color="amber" />
        <Card title="Damaged Items" value="7" icon={AlertTriangle} trend="-2 from last month" trendUp={false} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border-2 border-border rounded-lg p-6 shadow-sm">
          <h2 className="mb-4">Loan Activity (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={loanActivityData} key="bar-chart-loans">
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe6e9" key="grid-bar" />
              <XAxis dataKey="month" stroke="#7f8c8d" style={{ fontSize: '12px' }} tickLine={false} key="xaxis-bar" />
              <YAxis stroke="#7f8c8d" style={{ fontSize: '12px' }} tickLine={false} key="yaxis-bar" />
              <Tooltip
                key="tooltip-bar"
                contentStyle={{ backgroundColor: "#fff", border: "2px solid #3498db", borderRadius: '8px' }}
                cursor={{ fill: 'rgba(52, 152, 219, 0.1)' }}
              />
              <Bar dataKey="loans" fill="#3498db" radius={[6, 6, 0, 0]} animationDuration={500} key="bar-loans" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border-2 border-border rounded-lg p-6 shadow-sm">
          <h2 className="mb-4">Weekly Loan Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={loanActivityData} key="area-chart-trend">
              <defs>
                <linearGradient id="gradient-area-loan-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498db" stopOpacity={0.3} key="stop-1" />
                  <stop offset="95%" stopColor="#3498db" stopOpacity={0} key="stop-2" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe6e9" key="grid-area" />
              <XAxis dataKey="month" stroke="#7f8c8d" style={{ fontSize: '12px' }} tickLine={false} key="xaxis-area" />
              <YAxis stroke="#7f8c8d" style={{ fontSize: '12px' }} tickLine={false} key="yaxis-area" />
              <Tooltip
                key="tooltip-area"
                contentStyle={{ backgroundColor: "#fff", border: "2px solid #3498db", borderRadius: '8px' }}
                cursor={{ stroke: '#3498db', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="loans"
                stroke="#3498db"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#gradient-area-loan-trend)"
                animationDuration={500}
                key="area-loans"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        <div className="p-6 border-b-2 border-border">
          <h2>Recent Activity (Last 5 Transactions)</h2>
        </div>
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
                  <td className="px-6 py-4">{loan.student}</td>
                  <td className="px-6 py-4">{loan.item}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{loan.borrowDate}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{loan.dueDate}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium ${
                        loan.status === "Borrowed"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : loan.status === "Overdue"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-green-100 text-green-700 border-green-300"
                      }`}
                    >
                      {loan.status}
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
