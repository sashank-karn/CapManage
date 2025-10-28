"use client";

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../services/auth';
import { publishToast } from '../lib/toast';

interface UseRequireAuthOptions {
  roles?: Array<AuthUser['role']>;
  redirectTo?: string;
  silent?: boolean;
}

export const useRequireAuth = (options?: UseRequireAuthOptions) => {
  const { user, initialized } = useAuth();
  const router = useRouter();

  const roles = options?.roles;
  const rolesKey = useMemo(() => (roles && roles.length > 0 ? [...roles].sort().join('|') : ''), [roles]);
  const redirectTo = options?.redirectTo ?? '/login';
  const silent = options?.silent ?? false;

  const authorized = useMemo(() => {
    if (!user) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(user.role);
  }, [user, rolesKey]);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      if (!silent) {
        publishToast('Please sign in to continue.', 'info');
      }
      router.replace(redirectTo);
      return;
    }

    if (!authorized) {
      if (!silent) {
        publishToast('You do not have access to that area.', 'error');
      }
      router.replace('/dashboard');
    }
  }, [initialized, user, authorized, router, redirectTo, silent]);

  return { user, initialized, authorized };
};
