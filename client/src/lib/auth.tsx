import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiRequest, setAuthToken, getStoredToken, queryClient } from "./queryClient";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "driver" | "osm" | "admin" | "client";
  region: string | null;
  vehicleType: string | null;
  clientCompany: string | null;
  complianceStatus: string | null;
  status: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(!!getStoredToken());

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setAuthToken(null);
        setUser(null);
      }
    } catch {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  // Auto-restore session from stored token on mount, or SSO token from URL
  // Supports both ?sso= (command suite) and ?dcs_token= (legacy) param names
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("sso") || params.get("dcs_token");
    if (ssoToken) {
      setIsLoading(true);
      // Strip SSO token from URL immediately
      const clean = new URL(window.location.href);
      clean.searchParams.delete("sso");
      clean.searchParams.delete("dcs_token");
      window.history.replaceState({}, "", clean.pathname + clean.search);
      // Exchange SSO token for a local JWT
      fetch(`/api/auth/sso?token=${encodeURIComponent(ssoToken)}`)
        .then(res => res.ok ? res.json() : Promise.reject(new Error("SSO failed")))
        .then(data => {
          setAuthToken(data.token);
          setUser(data.user);
          queryClient.clear();
        })
        .catch(async () => {
          // SSO failed — fall back to stored token if available
          if (getStoredToken()) await refreshUser();
        })
        .finally(() => setIsLoading(false));
    } else if (getStoredToken()) {
      refreshUser().finally(() => setIsLoading(false));
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Login failed");
      }
      const data = await res.json();
      setAuthToken(data.token);
      setUser(data.user);
      queryClient.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
