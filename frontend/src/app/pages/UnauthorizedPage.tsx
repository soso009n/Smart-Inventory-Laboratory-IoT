import { Link, useNavigate } from "react-router";
import { LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold text-slate-800">Access denied</h1>
        <p className="text-sm text-slate-500">
          You do not have permission to view this page
          {user?.role ? ` as ${user.role}` : ""}. Please contact an administrator if you need
          access.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/dashboard"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Go Back
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}