import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type UserRole = 'admin' | 'student' | 'faculty';
export type FacultyStatus = 'pending' | 'approved' | 'rejected';

export interface IUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  enrollmentId?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  isEmailVerified: boolean;
  facultyStatus?: FacultyStatus;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  failedLoginAttempts: number;
  lockedAt?: Date;
  lastLoginAt?: Date;
  approvedBy?: string;
}

export interface IUserDocument extends IUser, Document<Types.ObjectId> {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, unique: true, required: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'student', 'faculty'], required: true },
    name: { type: String, required: true },
    enrollmentId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    facultyStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    emailVerificationToken: { type: String },
    emailVerificationTokenExpires: { type: Date },
    passwordResetToken: { type: String },
    passwordResetTokenExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedAt: { type: Date },
    lastLoginAt: { type: Date },
    approvedBy: { type: String }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1, facultyStatus: 1 });

export const User: Model<IUserDocument> = model<IUserDocument>('User', userSchema);
