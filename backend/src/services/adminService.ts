import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { User, type IUserDocument, type UserRole } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { env } from '../config/env';
import { sendMail } from '../utils/mailer';
import type { ApiError } from '../middleware/errorHandler';
import { logActivity } from './activityService';

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  enrollmentId?: string; // students
  department?: string; // faculty
  designation?: string; // faculty
  expertise?: string; // faculty
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

const buildApiError = (message: string, statusCode: number): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  return error;
};

export const listUsers = async (options: {
  search?: string;
  role?: UserRole;
  limit?: number;
  page?: number;
}): Promise<{ items: Array<Pick<IUserDocument, '_id' | 'name' | 'email' | 'role' | 'isActive' | 'isEmailVerified' | 'facultyStatus'>>; total: number }> => {
  const { search, role, limit = 20, page = 1 } = options;
  const query: Record<string, unknown> = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    User.find(query)
      .select('_id name email role isActive isEmailVerified facultyStatus')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query)
  ]);

  return { items, total };
};

export const createUser = async (input: CreateUserInput): Promise<IUserDocument> => {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw buildApiError('Email already exists', 409);
  }

  // Generate a temporary password and force reset via email
  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, env.saltRounds);

  const metadata: Record<string, unknown> = {};
  if (input.role === 'faculty') {
    metadata.department = input.department;
    metadata.designation = input.designation;
    if (input.expertise) metadata.expertise = input.expertise;
  }

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    role: input.role,
    passwordHash,
    enrollmentId: input.role === 'student' ? input.enrollmentId : undefined,
    isActive: true,
    isEmailVerified: true, // Admin-created users are considered verified
    facultyStatus: input.role === 'faculty' ? 'approved' : undefined,
    metadata
  });

  // Log activity
  await logActivity({
    type: 'user-create',
    userId: user._id,
    message: `User created with role ${user.role}`
  });

  // Email instructions to set a new password
  const resetToken = crypto.randomUUID();
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpires = dayjs().add(env.passwordResetExpiryMinutes, 'minute').toDate();
  await user.save();

  const resetUrl = `${env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`;
  await sendMail({
    to: user.email,
    subject: 'Your CapManage account is ready',
    html: `<p>Hello ${user.name},</p>
           <p>An administrator created an account for you. Set your password by clicking <a href="${resetUrl}">this link</a>.</p>`
  });

  return user;
};

export const updateUser = async (id: string, input: UpdateUserInput): Promise<IUserDocument> => {
  const user = await User.findById(id);
  if (!user) throw buildApiError('User not found', 404);

  if (input.email && input.email.toLowerCase() !== user.email) {
    const dup = await User.findOne({ email: input.email.toLowerCase() });
    if (dup) throw buildApiError('Email already in use', 409);
    user.email = input.email.toLowerCase();
  }
  if (input.name !== undefined) user.name = input.name;
  if (input.role) user.role = input.role;
  if (typeof input.isActive === 'boolean') user.isActive = input.isActive;

  await user.save();
  await logActivity({ type: 'user-update', userId: user._id, message: 'User updated' });
  return user;
};

export const activateUserById = async (id: string): Promise<IUserDocument> => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: true, failedLoginAttempts: 0, lockedAt: undefined },
    { new: true }
  );
  if (!user) throw buildApiError('User not found', 404);
  await logActivity({ type: 'activate', userId: user._id, message: 'User activated' });
  return user;
};

export const deactivateUserById = async (id: string): Promise<IUserDocument> => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!user) throw buildApiError('User not found', 404);
  await logActivity({ type: 'deactivate', userId: user._id, message: 'User deactivated' });
  return user;
};

export const deleteUserById = async (id: string): Promise<void> => {
  const user = await User.findById(id);
  if (!user) throw buildApiError('User not found', 404);
  await Promise.all([
    RefreshToken.deleteMany({ user: user._id }),
    User.findByIdAndDelete(user._id)
  ]);
  await logActivity({ type: 'user-delete', userId: user._id, message: 'User deleted' });
};

export const resendPasswordSetupById = async (id: string): Promise<void> => {
  const user = await User.findById(id);
  if (!user) throw buildApiError('User not found', 404);

  const resetToken = crypto.randomUUID();
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpires = dayjs().add(env.passwordResetExpiryMinutes, 'minute').toDate();
  await user.save();

  const resetUrl = `${env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`;
  await sendMail({
    to: user.email,
    subject: 'Set or reset your CapManage password',
    html: `<p>Hello ${user.name},</p>
           <p>You requested a password setup/reset. Click <a href="${resetUrl}">this link</a> to proceed.</p>`
  });
  await logActivity({ type: 'password-reset-request', userId: user._id, message: 'Password setup email resent' });
};

export const resendVerificationEmailById = async (id: string): Promise<void> => {
  const user = await User.findById(id);
  if (!user) throw buildApiError('User not found', 404);
  if (user.isEmailVerified) throw buildApiError('User already verified', 409);

  const verificationToken = crypto.randomUUID();
  user.emailVerificationToken = verificationToken;
  user.emailVerificationTokenExpires = dayjs().add(env.emailVerificationExpiryMinutes, 'minute').toDate();
  await user.save();

  const verificationUrl = `${env.FRONTEND_BASE_URL}/verify-email?token=${verificationToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your CapManage account',
    html: `<p>Hello ${user.name},</p>
           <p>Please verify your email by clicking <a href="${verificationUrl}">this link</a>.</p>`
  });
  await logActivity({ type: 'email-verification', userId: user._id, message: 'Verification email resent' });
};
