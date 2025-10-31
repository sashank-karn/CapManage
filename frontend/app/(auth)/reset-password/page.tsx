"use client";

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPassword } from '../../../services/auth';
import { publishToast } from '../../../lib/toast';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword']
  });

type ResetPasswordForm = z.infer<typeof schema>;

const ResetPasswordContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [completed, setCompleted] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema)
  });

  const onSubmit = handleSubmit(async (values: ResetPasswordForm) => {
    if (!token) {
      publishToast('Reset token missing. Use the link from your email.', 'error');
      return;
    }
    await resetPassword(token, values.password);
    setCompleted(true);
    publishToast('Password updated. You can now sign in.', 'success');
    setTimeout(() => {
      router.replace('/login');
    }, 2500);
  });

  return (
    <section className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className="text-sm text-slate-600">
          Choose a new password that meets the CapManage security policy. Your reset link expires in 30 minutes.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
        </div>
        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.confirmPassword ? <p className="text-xs text-red-600">{errors.confirmPassword.message}</p> : null}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
        >
          {isSubmitting ? 'Updating password…' : 'Update password'}
        </button>
        {completed ? (
          <p className="text-xs text-slate-500">Password changed. Redirecting you to sign in…</p>
        ) : null}
        {!token ? (
          <p className="text-xs text-red-600">
            Missing token. Follow the reset link from your inbox or request a new one from the forgot password page.
          </p>
        ) : null}
        <a className="block text-center text-sm text-indigo-600 hover:underline" href="/login">
          Return to sign in
        </a>
      </form>
    </section>
  );
};

const ResetPasswordPage = () => (
  <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
    <ResetPasswordContent />
  </Suspense>
);

export default ResetPasswordPage;
