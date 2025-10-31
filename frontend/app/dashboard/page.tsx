"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

// Legacy /dashboard route: immediately redirect users to their role home
const LegacyDashboardRedirect = () => {
  const { user, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'admin') router.replace('/admin');
    else if (user.role === 'student') router.replace('/student');
    else if (user.role === 'faculty') router.replace('/faculty');
    else router.replace('/');
  }, [initialized, user, router]);

  return null;
};

export default LegacyDashboardRedirect;
