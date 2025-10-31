import { Schema, model, type Document, type Model } from 'mongoose';

export type FileEventAction = 'upload' | 'download' | 'preview' | 'restore';

export interface IFileEventLog {
  user: Schema.Types.ObjectId;
  action: FileEventAction;
  submission: Schema.Types.ObjectId;
  versionNumber?: number;
  project?: Schema.Types.ObjectId;
  milestoneType?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface IFileEventLogDocument extends IFileEventLog, Document {}

const fileEventLogSchema = new Schema<IFileEventLogDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['upload', 'download', 'preview', 'restore'], required: true },
    submission: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    versionNumber: { type: Number },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    milestoneType: { type: String },
    ip: { type: String },
    userAgent: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fileEventLogSchema.index({ submission: 1, createdAt: -1 });

export const FileEventLog: Model<IFileEventLogDocument> = model<IFileEventLogDocument>('FileEventLog', fileEventLogSchema);
