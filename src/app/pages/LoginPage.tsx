import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, User, Box } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Student">("Admin");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-2xl p-8 border-2 border-border">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Box className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl mb-2 text-primary">Smart Inventory Lab</h1>
            <p className="text-sm text-muted-foreground">IoT Computer Engineering System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@lab.edu"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Login as</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "Admin" | "Student")}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent appearance-none transition-all"
                >
                  <option value="Admin">Admin</option>
                  <option value="Student">Student (Praktikan)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Login
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Smart Inventory Laboratory IoT System v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
