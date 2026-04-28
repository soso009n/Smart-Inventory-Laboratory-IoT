import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type UserRole = "admin" | "student";

export type AuthUser = {
  id: number | string;
  full_name: string;
  email: string;
  role: UserRole;
};

type AuthPayload = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (payload: AuthPayload) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "lab-iot-auth";

const isUserRole = (role: unknown): role is UserRole => role === "admin" || role === "student";

const readStoredAuth = (): AuthPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthPayload> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.token !== "string") return null;
    const user = parsed.user as Partial<AuthUser> | undefined;
    if (!user) return null;
    if (typeof user.full_name !== "string" || typeof user.email !== "string") return null;
    if (typeof user.id !== "string" && typeof user.id !== "number") return null;
    if (!isUserRole(user.role)) return null;
    return { token: parsed.token, user: user as AuthUser };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storedAuth = readStoredAuth();
  const [token, setToken] = useState<string | null>(storedAuth?.token ?? null);
  const [user, setUser] = useState<AuthUser | null>(storedAuth?.user ?? null);

  const login = useCallback((payload: AuthPayload) => {
    setToken(payload.token);
    setUser(payload.user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Unable to persist auth session.", error);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear auth session.", error);
    }
  }, []);

  const isAuthenticated = useCallback(() => Boolean(token && user), [token, user]);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated,
    }),
    [token, user, login, logout, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
