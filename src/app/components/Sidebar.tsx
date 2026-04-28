import { NavLink, useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, FileText, Users, Trash2, Box, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../contexts/AuthContext";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/loans", label: "Loans", icon: FileText },
  { path: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { path: "/trash", label: "Trash", icon: Trash2, roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const hasAccess = (roles?: UserRole[]) => !roles || (user ? roles.includes(user.role) : false);
  const visibleItems = navItems.filter((item) => hasAccess(item.roles));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg">Lab IoT</h1>
            <p className="text-xs text-sidebar-foreground/70">Inventory System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-primary text-white shadow-lg"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Database Connected</span>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
