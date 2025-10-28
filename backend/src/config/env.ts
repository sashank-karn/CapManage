import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_URI_LOCAL: z.string().optional(),
  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES: z.string().default('30'),
  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: z.string().default('30'),
  BCRYPT_SALT_ROUNDS: z.string().default('10'),
  MAIL_FROM: z.string().email().default('no-reply@example.com'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FRONTEND_BASE_URL: z.string().url().default('http://localhost:3000')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = {
  ...parsed.data,
  port: parseInt(parsed.data.PORT, 10),
  saltRounds: parseInt(parsed.data.BCRYPT_SALT_ROUNDS, 10),
  emailVerificationExpiryMinutes: parseInt(parsed.data.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES, 10),
  passwordResetExpiryMinutes: parseInt(parsed.data.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES, 10),
  smtpPort: parsed.data.SMTP_PORT ? parseInt(parsed.data.SMTP_PORT, 10) : undefined
};
