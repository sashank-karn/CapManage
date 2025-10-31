import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { env } from '../config/env';
import { User, type IUserDocument, type UserRole } from '../models/User';
import { FacultyRequest, type IFacultyRequestDocument } from '../models/FacultyRequest';
import { validatePassword } from '../utils/passwordPolicy';
import { sendMail } from '../utils/mailer';
import {
  generateTokenPair,
  revokeRefreshToken,
  revokeRefreshTokenById,
  verifyRefreshToken,
  type TokenPair
} from './tokenService';
import type { ApiError } from '../middleware/errorHandler';
import { logActivity } from './activityService';
import { Notification } from '../models/Notification';

interface RegisterStudentInput {
  name: string;
  email: string;
  enrollmentId: string;
  password: string;
}

interface RegisterFacultyInput {
  name: string;
  email: string;
  password: string;
  department: string;
  designation: string;
  expertise?: string;
}

interface LoginResult extends TokenPair {
  user: Pick<
    IUserDocument,
    '_id' | 'name' | 'email' | 'role' | 'isEmailVerified' | 'isActive' | 'facultyStatus'
  >;
}

const buildApiError = (message: string, statusCode: number): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  return error;
};

const ensureUniqueEmail = async (email: string): Promise<void> => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw buildApiError('Email already registered', 409);
  }
};

export const registerStudent = async (input: RegisterStudentInput): Promise<void> => {
  validatePassword(input.password);
  await ensureUniqueEmail(input.email);

  const passwordHash = await bcrypt.hash(input.password, env.saltRounds);
  const verificationToken = crypto.randomUUID();
  const verificationExpires = dayjs().add(env.emailVerificationExpiryMinutes, 'minute').toDate();

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    enrollmentId: input.enrollmentId,
    passwordHash,
    role: 'student',
    isActive: true,
    facultyStatus: undefined,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: verificationExpires,
    metadata: { source: 'self-service' }
  });

  const verificationUrl = `${env.FRONTEND_BASE_URL}/verify-email?token=${verificationToken}`;
  await sendMail({
    to: input.email,
    subject: 'Verify your CapManage account',
    html: `<p>Hello ${input.name},</p><p>Please verify your email by clicking <a href="${verificationUrl}">this link</a>. The link expires in ${env.emailVerificationExpiryMinutes} minutes.</p>`
  });

  await logActivity({ type: 'registration', userId: user._id, message: 'Student self-registered' });
};

export const registerFaculty = async (input: RegisterFacultyInput): Promise<IFacultyRequestDocument> => {
  validatePassword(input.password);
  await ensureUniqueEmail(input.email);

  const passwordHash = await bcrypt.hash(input.password, env.saltRounds);
  const verificationToken = crypto.randomUUID();
  const verificationExpires = dayjs().add(env.emailVerificationExpiryMinutes, 'minute').toDate();

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: 'faculty',
    isActive: false,
    facultyStatus: 'pending',
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: verificationExpires,
    metadata: {
      department: input.department,
      designation: input.designation,
      expertise: input.expertise
    }
  });

  const request = await FacultyRequest.create({
    user: user._id,
    department: input.department,
    designation: input.designation,
    expertise: input.expertise,
    status: 'pending'
  });

  const verificationUrl = `${env.FRONTEND_BASE_URL}/verify-email?token=${verificationToken}`;
  await sendMail({
    to: input.email,
    subject: 'Verify your CapManage faculty account',
    html: `<p>Hello ${input.name},</p><p>Please confirm your email by clicking <a href="${verificationUrl}">this link</a>. We will notify you once an administrator reviews your request.</p>`
  });

  await logActivity({ type: 'registration', userId: user._id, message: 'Faculty self-registered' });

  // Notify admins for approval
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).lean();
    for (const a of admins) {
      await Notification.create({
        recipient: a._id as any,
        title: 'Faculty approval pending',
        message: `${input.name} requested faculty access. Review in Admin dashboard.`,
        channel: ['in-app', 'email'],
        module: 'admin',
        meta: { requestId: request._id }
      } as any);
      // Best-effort email
      if (a.email) {
        const subject = 'Faculty approval pending';
        const html = `
          <p>Dear Admin,</p>
          <p><strong>${input.name}</strong> has requested faculty access.</p>
          <p><a href="${env.FRONTEND_BASE_URL}/admin">Open Admin dashboard to review</a></p>
        `;
        await sendMail({ to: a.email, subject, html });
      }
    }
  } catch {}

  return request;
};

export const verifyEmail = async (token: string): Promise<void> => {
  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) {
    throw buildApiError('Invalid verification token', 400);
  }

  if (user.emailVerificationTokenExpires && user.emailVerificationTokenExpires.getTime() < Date.now()) {
    throw buildApiError('Verification token expired', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpires = undefined;
  if (user.role === 'student') {
    user.isActive = true;
  }
  await user.save();
};

export const assertAccountStatus = (user: IUserDocument): void => {
  if (!user.isActive) {
    throw buildApiError('Account inactive. Please contact support.', 403);
  }

  if (user.failedLoginAttempts >= 5 && user.lockedAt) {
    throw buildApiError('Account locked due to multiple failed attempts', 423);
  }

  if (!user.isEmailVerified) {
    throw buildApiError('Email verification pending', 403);
  }

  if (user.role === 'faculty' && user.facultyStatus === 'pending') {
    throw buildApiError('Faculty approval pending', 403);
  }

  if (user.role === 'faculty' && user.facultyStatus === 'rejected') {
    throw buildApiError('Faculty request rejected. Contact admin.', 403);
  }
};

export const login = async (
  email: string,
  password: string,
  ipAddress?: string
): Promise<LoginResult> => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw buildApiError('Invalid credentials', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedAt = new Date();
    }
    await user.save();
    throw buildApiError('Invalid credentials', 401);
  }

  user.failedLoginAttempts = 0;
  user.lockedAt = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  assertAccountStatus(user);

  const tokenPair = await generateTokenPair(user, ipAddress);
  await logActivity({ type: 'login', userId: user._id, message: 'User logged in' });
  return {
    ...tokenPair,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      facultyStatus: user.facultyStatus
    }
  };
};

export const refreshSession = async (refreshToken: string, ipAddress?: string): Promise<LoginResult> => {
  const payload = await verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);

  if (!user) {
    throw buildApiError('User not found', 404);
  }

  assertAccountStatus(user);

  await revokeRefreshTokenById(payload.tokenId, ipAddress);
  const tokenPair = await generateTokenPair(user, ipAddress);

  return {
    ...tokenPair,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      facultyStatus: user.facultyStatus
    }
  };
};

export const logout = async (refreshToken: string, ipAddress?: string): Promise<void> => {
  await revokeRefreshToken(refreshToken, ipAddress);
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Silently succeed to avoid leaking registered emails
    return;
  }

  const resetToken = crypto.randomUUID();
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpires = dayjs()
    .add(env.passwordResetExpiryMinutes, 'minute')
    .toDate();
  await user.save();

  const resetUrl = `${env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your CapManage password',
    html: `<p>Hello ${user.name},</p><p>Reset your password by clicking <a href="${resetUrl}">this link</a>. The link expires in ${env.passwordResetExpiryMinutes} minutes.</p>`
  });
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const user = await User.findOne({ passwordResetToken: token });
  if (!user) {
    throw buildApiError('Invalid reset token', 400);
  }

  if (user.passwordResetTokenExpires && user.passwordResetTokenExpires.getTime() < Date.now()) {
    throw buildApiError('Reset token expired', 400);
  }

  validatePassword(newPassword);
  user.passwordHash = await bcrypt.hash(newPassword, env.saltRounds);
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockedAt = undefined;
  await user.save();
};

export const updateFacultyRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected',
  adminUser: IUserDocument
): Promise<IFacultyRequestDocument> => {
  const request = await FacultyRequest.findById(requestId).populate('user');
  if (!request) {
    throw buildApiError('Faculty request not found', 404);
  }

  request.status = status;
  request.reviewedAt = new Date();
  request.reviewedBy = adminUser._id;
  await request.save();

  const user = request.user as unknown as IUserDocument;
  user.facultyStatus = status;
  user.isActive = status === 'approved';
  user.approvedBy = adminUser._id.toString();
  await user.save();

  await logActivity({
    type: status === 'approved' ? 'faculty-approve' : 'faculty-reject',
    userId: user._id,
    actorId: adminUser._id,
    message: `Faculty request ${status}`
  });

  await sendMail({
    to: user.email,
    subject: `Faculty registration ${status}`,
    html: `<p>Hello ${user.name},</p><p>Your faculty registration request has been ${status}. Please log in to continue.</p>`
  });

  return request;
};

export const listFacultyRequests = async (
  status: 'pending' | 'approved' | 'rejected' = 'pending'
): Promise<IFacultyRequestDocument[]> => {
  return FacultyRequest.find({ status }).populate('user');
};

export const deactivateUser = async (userId: string): Promise<IUserDocument | null> => {
  return User.findByIdAndUpdate(
    userId,
    {
      isActive: false
    },
    { new: true }
  );
};

export const activateUser = async (userId: string): Promise<IUserDocument | null> => {
  return User.findByIdAndUpdate(
    userId,
    {
      isActive: true,
      failedLoginAttempts: 0,
      lockedAt: undefined
    },
    { new: true }
  );
};

export const changeUserRole = async (
  userId: string,
  role: UserRole
): Promise<IUserDocument | null> => {
  return User.findByIdAndUpdate(
    userId,
    { role },
    { new: true }
  );
};
