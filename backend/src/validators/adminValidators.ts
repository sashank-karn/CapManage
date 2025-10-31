import { z } from 'zod';

export const listUsersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.enum(['admin', 'student', 'faculty']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['admin', 'student', 'faculty']),
    enrollmentId: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    expertise: z.string().optional()
  })
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'student', 'faculty']).optional(),
    isActive: z.boolean().optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});
