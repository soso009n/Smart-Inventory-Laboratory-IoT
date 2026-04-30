import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useAuth, USER_ROLES } from "../../contexts/AuthContext";
import type { AuthUser } from "../../contexts/AuthContext";

type LoginSuccessResponse = {
  success: true;
  token: string;
  user: AuthUser;
};

type LoginErrorResponse = {
  success: false;
  message?: string;
  error?: string;
};

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

const LOGIN_URL = import.meta.env.VITE_AUTH_LOGIN_URL ?? "http://localhost:5555/api/auth/login";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;

    return data?.message ?? data?.error ?? error.message ?? "Login failed. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Login failed. Please try again.";
};

const isValidUser = (user: unknown): user is AuthUser => {
  if (!user || typeof user !== "object") return false;

  const candidate = user as Partial<AuthUser>;

  return Boolean(
    (typeof candidate.id === "string" || typeof candidate.id === "number") &&
      typeof candidate.full_name === "string" &&
      candidate.full_name.trim().length > 0 &&
      typeof candidate.email === "string" &&
      candidate.email.trim().length > 0 &&
      USER_ROLES.includes(candidate.role as AuthUser["role"])
  );
};

const isLoginSuccess = (data: unknown): data is LoginSuccessResponse => {
  if (!data || typeof data !== "object") return false;

  const candidate = data as Partial<LoginSuccessResponse>;

  return Boolean(
    candidate.success === true &&
      typeof candidate.token === "string" &&
      candidate.token.trim().length > 0 &&
      isValidUser(candidate.user)
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await axios.post<LoginResponse>(LOGIN_URL, {
        email: normalizedEmail,
        password,
      });

      if (!isLoginSuccess(response.data)) {
        setError(response.data?.message ?? "Login failed. Please check your credentials.");
        return;
      }

      login({
        token: response.data.token,
        user: response.data.user,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen bg-slate-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Lab Inventory Login</h1>
          <p className="text-sm text-slate-500">Sign in to manage laboratory assets securely.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}