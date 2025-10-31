import { Schema, model, Document, Model, Types } from 'mongoose';

export type ActivityType =
  | 'registration'
  | 'login'
  | 'user-create'
  | 'user-update'
  | 'user-delete'
  | 'activate'
  | 'deactivate'
  | 'role-change'
  | 'faculty-approve'
  | 'faculty-reject'
  | 'password-reset-request'
  | 'email-verification';

export interface IActivityLog {
  type: ActivityType;
  user: Types.ObjectId; // the subject user of the activity
  actor?: Types.ObjectId; // who performed the action (can be same as user)
  message: string;
  createdAt?: Date;
  meta?: Record<string, unknown>;
}

export interface IActivityLogDocument extends IActivityLog, Document {}

const activityLogSchema = new Schema<IActivityLogDocument>(
  {
    type: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });

export const ActivityLog: Model<IActivityLogDocument> = model<IActivityLogDocument>(
  'ActivityLog',
  activityLogSchema
);
