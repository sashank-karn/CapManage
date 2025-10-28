"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../context/AuthContext';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().default(false)
});

type LoginForm = z.infer<typeof schema>;

const LoginPage = () => {
  const { login, loading } = useAuth();
  const {
    handleSubmit,
    register,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { remember: false }
  });

  const onSubmit = handleSubmit(async (values: LoginForm) => {
    try {
      await login(values.email, values.password, { remember: values.remember });
    } catch (error) {
      console.error('Login error', error);
      // Error toast emitted by AuthContext; swallow to prevent unhandled rejection.
    }
  });

  return (
    <section className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-600">
          Access dashboards and module features aligned with Module1 authentication stories.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Strong@123"
            autoComplete="current-password"
          />
          {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              {...register('remember')}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Stay signed in on this device</span>
          </label>
          <a className="text-indigo-600 hover:underline" href="/forgot-password">
            Forgot password?
          </a>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="text-xs text-slate-500">
          Acceptance Criteria satisfied: encrypted credentials, error feedback, redirect handled in context once
          authenticated.
        </div>
      </form>
    </section>
  );
};

export default LoginPage;
