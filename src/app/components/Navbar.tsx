import { useState } from "react";
import { Search, Bell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export default function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentUser = {
    name: user?.full_name ?? "User",
    role: user?.role === "admin" ? "Admin" : "Student",
    email: user?.email ?? "unknown",
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="bg-card border-b-2 border-border h-16 flex items-center px-6 gap-6 shadow-sm">
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items, users, loans..."
            className="w-full pl-12 pr-4 py-2.5 border-2 border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2.5 hover:bg-muted rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
          >
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm">{currentUser.name}</div>
              <div className="text-xs text-muted-foreground">{currentUser.role}</div>
            </div>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left text-destructive"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
