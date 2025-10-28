"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestPasswordReset } from '../../../services/auth';
import { publishToast } from '../../../lib/toast';

const schema = z.object({
  email: z.string().email('Enter the email you used to register')
});

type ForgotPasswordForm = z.infer<typeof schema>;

const ForgotPasswordPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema)
  });

  const onSubmit = handleSubmit(async (values: ForgotPasswordForm) => {
    await requestPasswordReset(values.email);
    setSubmitted(true);
    publishToast('If that email is registered, a reset link is on the way.', 'info');
  });

  return (
    <section className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
        <p className="text-sm text-slate-600">
          Enter your registered email and we&apos;ll send you a secure reset link that expires in 30 minutes.
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
            autoComplete="email"
            {...register('email')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="you@example.com"
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
        >
          {isSubmitting ? 'Sending reset link…' : 'Send reset link'}
        </button>
        {submitted ? (
          <p className="text-xs text-slate-500">
            Check your inbox for the reset email. Didn&apos;t get it? Verify your spam folder or request another link.
          </p>
        ) : null}
        <a className="block text-center text-sm text-indigo-600 hover:underline" href="/login">
          Return to sign in
        </a>
      </form>
    </section>
  );
};

export default ForgotPasswordPage;
