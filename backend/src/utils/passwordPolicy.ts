import { z } from 'zod';
import type { ApiError } from '../middleware/errorHandler';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((value: string) => /[a-z]/.test(value), 'Password must contain a lowercase letter')
  .refine((value: string) => /[A-Z]/.test(value), 'Password must contain an uppercase letter')
  .refine((value: string) => /[0-9]/.test(value), 'Password must contain a number')
  .refine((value: string) => /[^A-Za-z0-9]/.test(value), 'Password must contain a special character');

export const validatePassword = (password: string): void => {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    const primaryIssue = result.error.issues[0];
    const error = new Error(primaryIssue?.message ?? 'Invalid password format.') as ApiError;
    error.statusCode = 400;
    error.details = result.error.issues;
    throw error;
  }
};
