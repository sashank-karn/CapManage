import { Schema, model, type Document, type Model } from 'mongoose';

export type NotificationChannel = 'in-app' | 'email';

export interface INotification {
  recipient: Schema.Types.ObjectId;
  title: string;
  message: string;
  channel: NotificationChannel[];
  meta?: Record<string, unknown>;
  scheduledFor?: Date;
  sentAt?: Date;
  module: string;
}

export interface INotificationDocument extends INotification, Document {
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: { type: [String], enum: ['in-app', 'email'], default: ['in-app'] },
    meta: { type: Schema.Types.Mixed },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    module: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, module: 1 });

export const Notification: Model<INotificationDocument> = model<INotificationDocument>('Notification', notificationSchema);
