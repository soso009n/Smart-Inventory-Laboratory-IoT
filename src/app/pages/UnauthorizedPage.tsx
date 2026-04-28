import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-800">Access denied</h1>
        <p className="text-sm text-slate-500">
          You do not have permission to view this page. Please contact an administrator if you need
          access.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
