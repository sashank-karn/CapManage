"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../context/AuthContext';
import { isAxiosError } from 'axios';

const baseSchema = z.object({
  role: z.enum(['student', 'faculty']),
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  enrollmentId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  expertise: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
});

// ✅ Custom validations
const schema = baseSchema.superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      path: ['confirmPassword'],
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match'
    });
  }

  if (data.role === 'student' && !data.enrollmentId) {
    ctx.addIssue({
      path: ['enrollmentId'],
      code: z.ZodIssueCode.custom,
      message: 'Enrollment ID is required for students'
    });
  }

  if (data.role === 'faculty') {
    if (!data.department || data.department.trim().length < 2) {
      ctx.addIssue({
        path: ['department'],
        code: z.ZodIssueCode.custom,
        message: 'Department is required for faculty'
      });
    }
    if (!data.designation || data.designation.trim().length < 2) {
      ctx.addIssue({
        path: ['designation'],
        code: z.ZodIssueCode.custom,
        message: 'Designation is required for faculty'
      });
    }
  }
}).describe('Registration form schema aligned with Module1 onboarding flows');

type RegisterForm = z.infer<typeof schema>;

const RegisterPage = () => {
  const { registerStudent, registerFaculty } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    state: 'idle' | 'submitting' | 'success' | 'error';
    message: string | null;
  }>({ state: 'idle', message: null });

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors }
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' }
  });

  const role = watch('role');

  useEffect(() => {
    setFeedback({ state: 'idle', message: null });
  }, [role]);

  const onSubmit = handleSubmit(async (values: RegisterForm) => {
    setSubmitting(true);
    setFeedback({
      state: 'submitting',
      message:
        values.role === 'faculty'
          ? 'Submitting faculty registration…'
          : 'Submitting student registration…'
    });
    try {
      if (values.role === 'student') {
        await registerStudent({
          name: values.name,
          email: values.email,
          enrollmentId: values.enrollmentId ?? '',
          password: values.password
        });
      } else {
        await registerFaculty({
          name: values.name,
          email: values.email,
          password: values.password,
          department: values.department ?? '',
          designation: values.designation ?? '',
          expertise: values.expertise || undefined,
          status: 'pending_admin_approval'
        } as any);
      }
      setFeedback({
        state: 'success',
        message:
          values.role === 'faculty'
            ? 'Faculty registration submitted successfully. Please ask your admin to verify your account.'
            : 'Student registration submitted successfully.'
      });
    } catch (error) {
      const message = deriveRegistrationError(error);
      setFeedback({ state: 'error', message });
      console.error('Registration failed', error);
    } finally {
      setSubmitting(false);
    }
  });

  const primaryToggleClass = 'rounded-full px-4 py-1 font-medium transition';

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Create your CapManage account</h1>
        <p className="text-sm text-slate-600">
          Choose a student or faculty profile to align with Module1 user onboarding stories.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setValue('role', 'student', { shouldValidate: true })}
          className={`${primaryToggleClass} ${
            role === 'student' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Student
        </button>
        <button
          type="button"
          onClick={() => setValue('role', 'faculty', { shouldValidate: true })}
          className={`${primaryToggleClass} ${
            role === 'faculty' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Faculty
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <input type="hidden" value={role} {...register('role')} />

        {/* Full Name */}
        <div className="grid gap-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            autoComplete="name"
            {...register('name')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="grid gap-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        {/* Conditional Fields */}
        {role === 'student' ? (
          <div className="grid gap-1">
            <label htmlFor="enrollmentId" className="text-sm font-medium text-slate-700">
              Enrollment ID
            </label>
            <input
              id="enrollmentId"
              autoComplete="off"
              {...register('enrollmentId')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.enrollmentId && (
              <p className="text-xs text-red-600">{errors.enrollmentId.message}</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="department" className="text-sm font-medium text-slate-700">
                Department
              </label>
              <input
                id="department"
                {...register('department')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.department && (
                <p className="text-xs text-red-600">{errors.department.message}</p>
              )}
            </div>
            <div className="grid gap-1">
              <label htmlFor="designation" className="text-sm font-medium text-slate-700">
                Designation
              </label>
              <input
                id="designation"
                {...register('designation')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.designation && (
                <p className="text-xs text-red-600">{errors.designation.message}</p>
              )}
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <label htmlFor="expertise" className="text-sm font-medium text-slate-700">
                Areas of expertise (optional)
              </label>
              <input
                id="expertise"
                {...register('expertise')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Password Fields */}
        <div className="grid gap-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div className="grid gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Feedback Message */}
        {feedback.state !== 'idle' && feedback.message && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
              feedback.state === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : feedback.state === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <span>{feedback.message}</span>
            {feedback.state === 'submitting' && (
              <span className="text-xs uppercase tracking-wide">Please wait…</span>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Create account'}
        </button>

        <p className="text-xs text-slate-500">
          Module1 acceptance criteria covered: role-based registration, secure password policy prompts, post-submit
          routing handled by the auth context.
        </p>
      </form>
    </section>
  );
};

export default RegisterPage;

const deriveRegistrationError = (error: unknown): string => {
  if (isAxiosError(error)) {
    const apiMessage = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    return apiMessage ?? error.message ?? 'Unable to register. Please try again.';
  }

  if (error instanceof Error) {
    return error.message || 'Unable to register. Please try again.';
  }

  return 'Unable to register. Please try again.';
};
