"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { fetchJson, getAccessToken, setAccessToken } from "@/lib/fetcher";
import type { AuthUser } from "@/lib/definitions";

type Credentials = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (credentials: Credentials) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = "barberflow_access_token";

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

async function fetchUserFromToken(token: string): Promise<AuthUser> {
  const response = await fetchJson<{ data: AuthUser }>("/api/auth/me", {
    credentials: "omit",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

async function refreshSession(): Promise<AuthUser> {
  const response = await fetchJson<{ data: { user: AuthUser; accessToken: string } }>("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  setAccessToken(response.data.accessToken);
  return response.data.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await fetchUserFromToken(token);
        if (!isMounted) return;
        setUser(me);
      } catch (error) {
        try {
          const refreshed = await refreshSession();
          if (isMounted) {
            setUser(refreshed);
          }
        } catch (refreshError) {
          setStoredToken(null);
          if (isMounted) {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (credentials: Credentials) => {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const response = await fetchJson<{ data: { user: AuthUser; accessToken: string } }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, email: normalizedEmail }),
    });
    setStoredToken(response.data.accessToken);
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    return response.data.user;
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return null;
    try {
      const me = await fetchUserFromToken(token);
      setUser(me);
      return me;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signOut,
      refreshUser,
    }),
    [user, isLoading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
