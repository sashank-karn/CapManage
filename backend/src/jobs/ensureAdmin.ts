import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { env } from '../config/env';

/**
 * Creates a default admin user when one does not exist.
 * Uses ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD from environment (with dev defaults).
 */
export const ensureDefaultAdmin = async (): Promise<void> => {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    return; // Do nothing if an admin with this email already exists
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.saltRounds);
  await User.create({
    name: env.ADMIN_NAME,
    email,
    role: 'admin',
    passwordHash,
    isActive: true,
    isEmailVerified: true,
    metadata: { source: 'bootstrap' }
  });

  // eslint-disable-next-line no-console
  console.log(`[bootstrap] Admin user created: ${email}`);
};
