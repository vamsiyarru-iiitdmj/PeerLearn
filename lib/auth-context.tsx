"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiLogin,
  apiLogout,
  apiGetProfile,
  type StudentProfile,
  type LoginPayload,
  ApiError,
  AuthSession,
} from "./api";

interface AuthState {
  token: string | null;
  student: StudentProfile | null;
  loading: boolean;
  error: string | null;
  mode: "student" | "tutor";
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  clearError: () => void;
  setMode: (mode: "student" | "tutor") => void;
  refreshProfile: () => Promise<void>;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "pl_access_token";
const MODE_KEY = "pl_user_mode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const [state, setState] = useState<AuthState>({
    token: null,
    student: null,
    loading: true,
    error: null,
    mode: "student",
  });

  // Restore session and mode from localStorage on mount
  useEffect(() => {
    const savedMode = (localStorage.getItem(MODE_KEY) as "student" | "tutor") || "student";
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setState((s) => ({ ...s, mode: savedMode, loading: false }));
      return;
    }
    // Validate token by fetching the student profile
    apiGetProfile(stored)
      .then((student) => {
        setState({ token: stored, student, loading: false, error: null, mode: savedMode });
      })
      .catch(() => {
        // Token expired or invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        setState({ token: null, student: null, loading: false, error: null, mode: "student" });
      });
  }, []);

  const setMode = useCallback((newMode: "student" | "tutor") => {
    localStorage.setItem(MODE_KEY, newMode);
    setState((s) => ({ ...s, mode: newMode }));
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = state.token || (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
    if (!token) return;
    try {
      const student = await apiGetProfile(token);
      setState((s) => ({ ...s, student }));
    } catch {
      // ignore
    }
  }, [state.token]);

  const login = useCallback(async (payload: LoginPayload) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const session = await apiLogin(payload);
      const token = session.accessToken || (session as any).access_token;
      if (!token) throw new Error("Authentication failed: No access token received");
      localStorage.setItem(TOKEN_KEY, token);
      // Fetch full profile
      const student = session.student ?? (await apiGetProfile(token));
      setState((s) => ({ ...s, token, student, loading: false, error: null }));
      router.push("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed. Please try again.";
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [router]);

  const logout = useCallback(async () => {
    const { token } = state;
    setState((s) => ({ ...s, loading: true }));
    try {
      if (token) await apiLogout(token);
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setState((s) => ({ ...s, token: null, student: null, loading: false, error: null }));
      router.push("/login");
    }
  }, [state, router]);

  const setSession = useCallback((session: AuthSession) => {
    const token = session.accessToken || (session as any).access_token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setState((s) => ({
        ...s,
        token,
        student: session.student ?? null,
        loading: false,
        error: null,
      }));
      if (!session.student) {
        apiGetProfile(token)
          .then((stud) => setState((prev) => ({ ...prev, student: stud })))
          .catch(() => { });
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setSession,
        clearError,
        setMode,
        refreshProfile,
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Hook that redirects to /login if no session exists (use in protected pages) */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.token) {
      router.replace("/login");
    }
  }, [auth.loading, auth.token, router]);
  return auth;
}
