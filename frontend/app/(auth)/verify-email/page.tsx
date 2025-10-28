"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail } from '../../../services/auth';
import { publishToast } from '../../../lib/toast';

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token missing. Please use the link from your email.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      setStatus('pending');
      try {
        await verifyEmail(token);
        if (cancelled) return;
        setStatus('success');
        setMessage('Email verified successfully. Redirecting to sign in…');
        publishToast('Email verified. You can now sign in.', 'success');
        setTimeout(() => {
          router.replace('/login');
        }, 2500);
      } catch (error) {
        console.error('Verification failed', error);
        if (cancelled) return;
        setStatus('error');
        setMessage('Verification failed. Your link may have expired. Request a new verification email.');
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Verify your email</h1>
      {status === 'pending' ? (
        <p className="text-sm text-slate-600">We&apos;re confirming your email. This only takes a moment…</p>
      ) : null}
      {status === 'success' ? <p className="text-sm text-green-700">{message}</p> : null}
      {status === 'error' ? <p className="text-sm text-red-600">{message}</p> : null}
      {status === 'error' ? (
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Return to sign in
        </button>
      ) : null}
    </section>
  );
};

export default VerifyEmailPage;
