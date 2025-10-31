"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import {
  login as loginRequest,
  logout as logoutRequest,
  registerFaculty,
  registerStudent,
  refreshSession,
  type AuthUser
} from '../services/auth';
import { setAccessToken } from '../services/api';
import { publishToast } from '../lib/toast';

type StorageMode = 'local' | 'session';

interface PersistedSession {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string, options?: { remember?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  registerStudent: (payload: {
    name: string;
    email: string;
    enrollmentId: string;
    password: string;
  }) => Promise<void>;
  registerFaculty: (payload: {
    name: string;
    email: string;
    password: string;
    department: string;
    designation: string;
    expertise?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'capmanage.auth';

const emptySession: PersistedSession = {
  user: null,
  accessToken: null,
  refreshToken: null
};

const readSession = (storage: Storage): PersistedSession | null => {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid session payload');
    }
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null
    };
  } catch (error) {
    console.warn('Failed to parse persisted auth state', error);
    storage.removeItem(STORAGE_KEY);
    return null;
  }
};

const clearPersistedSession = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
};

const loadPersistedSession = (): { session: PersistedSession; mode: StorageMode | null } => {
  if (typeof window === 'undefined') {
    return { session: emptySession, mode: null };
  }

  const localSession = readSession(window.localStorage);
  if (localSession) {
    return { session: localSession, mode: 'local' };
  }

  const sessionSession = readSession(window.sessionStorage);
  if (sessionSession) {
    return { session: sessionSession, mode: 'session' };
  }

  return { session: emptySession, mode: null };
};

const persistSession = (session: PersistedSession, mode: StorageMode | null): void => {
  if (typeof window === 'undefined') return;

  if (!session.user || !session.accessToken || !session.refreshToken || !mode) {
    clearPersistedSession();
    return;
  }

  const targetStorage = mode === 'local' ? window.localStorage : window.sessionStorage;
  const oppositeStorage = mode === 'local' ? window.sessionStorage : window.localStorage;

  oppositeStorage.removeItem(STORAGE_KEY);
  targetStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    })
  );
};

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const apiMessage = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    return apiMessage ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [{ session: initialSession, mode: initialMode }] = useState(loadPersistedSession);

  const [user, setUser] = useState<AuthUser | null>(initialSession.user);
  const [accessToken, setAccessTokenState] = useState<string | null>(initialSession.accessToken);
  const [refreshToken, setRefreshToken] = useState<string | null>(initialSession.refreshToken);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(initialMode);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!storageMode) {
      if (!user && !accessToken && !refreshToken) {
        clearPersistedSession();
      }
      return;
    }
    persistSession({ user, accessToken, refreshToken }, storageMode);
  }, [user, accessToken, refreshToken, storageMode]);

  const resetSession = useCallback(() => {
    setUser(null);
    setAccessTokenState(null);
    setRefreshToken(null);
    setAccessToken(null);
    setStorageMode(null);
    clearPersistedSession();
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) return;
    try {
      const response = await refreshSession(refreshToken);
      setUser(response.user);
      setAccessTokenState(response.accessToken);
      setRefreshToken(response.refreshToken);
      setAccessToken(response.accessToken);
    } catch (error) {
      console.error('Failed to refresh session', error);
      resetSession();
    }
  }, [refreshToken, resetSession]);

  useEffect(() => {
    let cancelled = false;

    if (user) {
      setInitialized(true);
      return () => {
        cancelled = true;
      };
    }

    if (!refreshToken) {
      setInitialized(true);
      return () => {
        cancelled = true;
      };
    }

    const bootstrap = async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken, refresh]);

  const handleLogin = useCallback(
    async (email: string, password: string, options?: { remember?: boolean }) => {
      setLoading(true);
      try {
        const response = await loginRequest({ email, password });
        setUser(response.user);
        setAccessTokenState(response.accessToken);
        setRefreshToken(response.refreshToken);
        setAccessToken(response.accessToken);
        setStorageMode(options?.remember ? 'local' : 'session');
        setInitialized(true);
        publishToast(`Welcome back, ${response.user.name}!`, 'success');
          if (pathname === '/login' || pathname === '/register') {
            // Send users to the role-aware home. The '/' page will route admins to /admin
            // and show faculty/students their respective home content.
            router.push('/');
        }
      } catch (error) {
        const message = extractApiErrorMessage(error, 'Unable to sign in. Check your credentials.');
        publishToast(message, 'error');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [pathname, router]
  );

  const handleLogout = useCallback(async () => {
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch (error) {
        console.warn('Logout request failed', error);
      }
    }
    resetSession();
        // Send users back to role-aware home instead of the old dashboard
        router.push('/');
  }, [refreshToken, resetSession, router]);

  const handleRegisterStudent = useCallback(
    async (payload: { name: string; email: string; enrollmentId: string; password: string }) => {
      try {
        await registerStudent(payload);
        publishToast('Student registration submitted. Check your email to verify.', 'success');
        router.push('/login');
      } catch (error) {
        const message = extractApiErrorMessage(error, 'Unable to register student account.');
        publishToast(message, 'error');
        throw error;
      }
    },
    [router]
  );

  const handleRegisterFaculty = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      department: string;
      designation: string;
      expertise?: string;
    }) => {
      try {
        await registerFaculty(payload);
        publishToast('Faculty registration received. Await admin approval.', 'info');
        router.push('/login');
      } catch (error) {
        const message = extractApiErrorMessage(error, 'Unable to register faculty account.');
        publishToast(message, 'error');
        throw error;
      }
    },
    [router]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading,
      initialized,
      login: handleLogin,
      logout: handleLogout,
      registerStudent: handleRegisterStudent,
      registerFaculty: handleRegisterFaculty
    }),
    [user, accessToken, refreshToken, loading, initialized, handleLogin, handleLogout, handleRegisterStudent, handleRegisterFaculty]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
