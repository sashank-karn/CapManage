import { Schema, model, type Document, type Model } from 'mongoose';

export interface IReportSnapshot {
  module: string;
  scope: 'student' | 'faculty' | 'admin';
  owner: Schema.Types.ObjectId;
  filters?: Record<string, unknown>;
  payload: Record<string, unknown>;
  generatedAt: Date;
  format: 'json' | 'pdf' | 'xlsx';
}

export interface IReportSnapshotDocument extends IReportSnapshot, Document {
  createdAt: Date;
  updatedAt: Date;
}

const reportSnapshotSchema = new Schema<IReportSnapshotDocument>(
  {
    module: { type: String, required: true },
    scope: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    filters: { type: Schema.Types.Mixed },
    payload: { type: Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, default: Date.now },
    format: { type: String, enum: ['json', 'pdf', 'xlsx'], default: 'json' }
  },
  {
    timestamps: true
  }
);

reportSnapshotSchema.index({ owner: 1, module: 1 });

export const ReportSnapshot: Model<IReportSnapshotDocument> = model<IReportSnapshotDocument>('ReportSnapshot', reportSnapshotSchema);
