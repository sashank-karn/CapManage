import { Schema, model, type Document, type Model } from 'mongoose';

export interface IEvaluationHistory {
  submission: Schema.Types.ObjectId;
  faculty: Schema.Types.ObjectId;
  rubricScores?: Record<string, number>;
  totalScore?: number;
  comments?: string;
  status?: 'submitted' | 'under-review' | 'approved' | 'revisions-requested';
  revisionDueDate?: Date;
}

export interface IEvaluationHistoryDocument extends IEvaluationHistory, Document {
  createdAt: Date;
  updatedAt: Date;
}

const evaluationHistorySchema = new Schema<IEvaluationHistoryDocument>(
  {
    submission: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rubricScores: { type: Schema.Types.Mixed },
    totalScore: { type: Number },
    comments: { type: String },
    status: { type: String, enum: ['submitted', 'under-review', 'approved', 'revisions-requested'] },
    revisionDueDate: { type: Date }
  },
  { timestamps: true }
);

evaluationHistorySchema.index({ submission: 1, createdAt: -1 });

export const EvaluationHistory: Model<IEvaluationHistoryDocument> = model<IEvaluationHistoryDocument>('EvaluationHistory', evaluationHistorySchema);
