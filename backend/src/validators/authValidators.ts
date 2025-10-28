import { z } from 'zod';

export const registerStudentSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    enrollmentId: z.string().min(3),
    password: z.string().min(8)
  })
});

export const registerFacultySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    department: z.string().min(1),
    designation: z.string().min(1),
    expertise: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(10)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

export const requestResetSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8)
  })
});
