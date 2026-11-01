"use client";

import type { AuthSession } from "@catering/shared-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { refreshTokens, signOut as apiSignOut, platformSignOut } from "@/lib/auth-api";

const ACCESS_TOKEN_KEY = "catering_access_token";
const REFRESH_TOKEN_KEY = "catering_refresh_token";
const SESSION_KEY = "catering_session";

interface AuthContextValue {
  session: AuthSession | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isPlatform: boolean;
  isTenant: boolean;
  setAuth: (accessToken: string, refreshToken: string, session: AuthSession) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAccessToken(localStorage.getItem(ACCESS_TOKEN_KEY));
    setRefreshToken(localStorage.getItem(REFRESH_TOKEN_KEY));
    setSession(parseSession(localStorage.getItem(SESSION_KEY)));
    setLoaded(true);
  }, []);

  const setAuth = useCallback(
    (newAccessToken: string, newRefreshToken: string, newSession: AuthSession) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setSession(newSession);
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    if (refreshToken) {
      try {
        if (session?.scope === "platform") {
          await platformSignOut(refreshToken);
        } else {
          await apiSignOut(refreshToken);
        }
      } catch {
        // Ignore errors during sign-out API call
      }
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setSession(null);
  }, [refreshToken, session?.scope]);

  // Auto-refresh before token expiry
  useEffect(() => {
    if (!refreshToken || !accessToken) return;

    const timer = setInterval(
      async () => {
        try {
          const result = await refreshTokens(refreshToken);
          localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
          setAccessToken(result.accessToken);
          setRefreshToken(result.refreshToken);
        } catch {
          await handleSignOut();
        }
      },
      13 * 60 * 1000, // Refresh 2 min before 15-min expiry
    );

    return () => clearInterval(timer);
  }, [refreshToken, accessToken, handleSignOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      accessToken,
      isAuthenticated: !!session && !!accessToken,
      isPlatform: session?.scope === "platform",
      isTenant: session?.scope === "tenant",
      setAuth,
      signOut: handleSignOut,
    }),
    [session, accessToken, setAuth, handleSignOut],
  );

  if (!loaded) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
