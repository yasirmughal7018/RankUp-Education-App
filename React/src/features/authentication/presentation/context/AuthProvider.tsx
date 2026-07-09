import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { configureApiAuth } from "@/core/api/apiClient";
import type { ApiError, AuthSession, CurrentUser } from "@/core/api/types";
import {
  clearStoredSession,
  readStoredRefreshToken,
  readStoredSession,
  saveStoredSession,
  updateStoredTokens,
} from "@/core/auth/tokenStorage";
import * as authApi from "@/features/authentication/data/authApi";
import { ChangePasswordModal } from "@/features/authentication/presentation/components/ChangePasswordModal";

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const setActiveSession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      const refreshToken =
        sessionRef.current?.refreshToken ?? readStoredRefreshToken();

      if (!refreshToken) {
        clearStoredSession();
        setActiveSession(null);
        return null;
      }

      try {
        const tokens = await authApi.refreshTokens(refreshToken);
        updateStoredTokens(tokens.accessToken, tokens.refreshToken);

        if (sessionRef.current) {
          const nextSession = {
            ...sessionRef.current,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          };
          saveStoredSession(nextSession);
          setActiveSession(nextSession);
        }

        return tokens.accessToken;
      } catch {
        clearStoredSession();
        setActiveSession(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [setActiveSession]);

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshAccessToken,
    });
  }, [refreshAccessToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
        return;
      }

      setActiveSession(storedSession);

      try {
        const user = await authApi.getCurrentUser();
        const nextSession = { ...storedSession, user };
        saveStoredSession(nextSession);
        if (!cancelled) {
          setActiveSession(nextSession);
        }
      } catch {
        clearStoredSession();
        if (!cancelled) {
          setActiveSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setActiveSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const nextSession = await authApi.login({ username, password });
        saveStoredSession(nextSession);
        setActiveSession(nextSession);
      } catch (caught) {
        const apiError = caught as ApiError;
        setError(apiError.message || "Unable to sign in.");
        throw caught;
      } finally {
        setIsSubmitting(false);
      }
    },
    [setActiveSession],
  );

  const logout = useCallback(async () => {
    const refreshToken =
      sessionRef.current?.refreshToken ?? readStoredRefreshToken();

    try {
      await authApi.logout(refreshToken);
    } catch {
      // Local session is cleared even if the API call fails.
    } finally {
      clearStoredSession();
      setActiveSession(null);
      setError(null);
    }
  }, [setActiveSession]);

  const updateUser = useCallback(
    (user: CurrentUser) => {
      if (!sessionRef.current) {
        return;
      }

      const nextSession = { ...sessionRef.current, user };
      saveStoredSession(nextSession);
      setActiveSession(nextSession);
    },
    [setActiveSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      isBootstrapping,
      isSubmitting,
      error,
      login,
      logout,
      clearError: () => setError(null),
      updateUser,
    }),
    [session, isBootstrapping, isSubmitting, error, login, logout, updateUser],
  );

  const mustChangePassword = Boolean(session?.user?.mustChangePassword);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {mustChangePassword ? (
        <ChangePasswordModal
          onSuccess={(user) => {
            updateUser({ ...user, mustChangePassword: false });
          }}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
