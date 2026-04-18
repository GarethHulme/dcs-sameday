import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { apiRequest, setAuthToken, queryClient } from "./queryClient";

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
  const [isLoading, setIsLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

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
