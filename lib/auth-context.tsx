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
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "pl_access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    student: null,
    loading: true,
    error: null,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    // Validate token by fetching the student profile
    apiGetProfile(stored)
      .then((student) => {
        setState({ token: stored, student, loading: false, error: null });
      })
      .catch(() => {
        // Token expired or invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        setState({ token: null, student: null, loading: false, error: null });
      });
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const session = await apiLogin(payload);
      const token = session.accessToken || (session as any).access_token;
      if (!token) throw new Error("Authentication failed: No access token received");
      localStorage.setItem(TOKEN_KEY, token);
      // Fetch full profile
      const student = session.student ?? (await apiGetProfile(token));
      setState({ token, student, loading: false, error: null });
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
      setState({ token: null, student: null, loading: false, error: null });
      router.push("/login");
    }
  }, [state, router]);

  const setSession = useCallback((session: AuthSession) => {
    const token = session.accessToken || (session as any).access_token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setState({
        token,
        student: session.student ?? null,
        loading: false,
        error: null,
      });
      if (!session.student) {
        apiGetProfile(token)
          .then((s) => setState((prev) => ({ ...prev, student: s })))
          .catch(() => { });
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setSession, clearError }}>
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
