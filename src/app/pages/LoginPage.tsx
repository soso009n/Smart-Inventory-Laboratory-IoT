import { useState } from "react";
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
};

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

const LOGIN_URL = import.meta.env.VITE_AUTH_LOGIN_URL ?? "http://localhost:5555/api/auth/login";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? "Login failed. Please try again.";
  }
  return "Login failed. Please try again.";
};

const isValidUser = (user: AuthUser | undefined): user is AuthUser =>
  Boolean(
    user &&
      typeof user.full_name === "string" &&
      typeof user.email === "string" &&
      (typeof user.id === "string" || typeof user.id === "number") &&
      USER_ROLES.includes(user.role)
  );

const isLoginSuccess = (data: LoginResponse): data is LoginSuccessResponse =>
  data.success === true && typeof data.token === "string" && isValidUser(data.user);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await axios.post<LoginResponse>(LOGIN_URL, { email, password });
      if (isLoginSuccess(response.data)) {
        login({ token: response.data.token, user: response.data.user });
        return;
      }
      setError("Login failed. Please check your credentials.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-10">
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
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
