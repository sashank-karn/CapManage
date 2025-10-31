"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const RoleAwareHome = () => {
  const { user, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect users to their role home
    if (user.role === 'admin') {
      router.replace('/admin');
    } else if (user.role === 'student') {
      router.replace('/student');
    } else if (user.role === 'faculty') {
      router.replace('/faculty');
    }
  }, [initialized, user, router]);

  // While auth initializes, render a tiny placeholder to avoid layout shift
  if (!initialized) {
    return <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />;
  }

  // Unauthenticated users are redirected to /login by the effect above; render nothing
  return null;
};

export default RoleAwareHome;
