import { Schema, model, Types } from 'mongoose';

export type ReportType = 'student-timeline' | 'faculty-progress' | 'admin-dept-stats';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

interface ReportScheduleDoc {
  user: Types.ObjectId;
  type: ReportType;
  frequency: ReportFrequency;
  recipients: string[];
  nextRunAt: Date;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportScheduleSchema = new Schema<ReportScheduleDoc>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['student-timeline', 'faculty-progress', 'admin-dept-stats'], required: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  recipients: { type: [String], default: [] },
  nextRunAt: { type: Date, required: true },
  lastSentAt: { type: Date }
}, { timestamps: true });

export const ReportSchedule = model<ReportScheduleDoc>('ReportSchedule', ReportScheduleSchema);
