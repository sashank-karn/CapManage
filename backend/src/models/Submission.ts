import { Schema, model, type Document, type Model } from 'mongoose';

export type SubmissionStatus = 'submitted' | 'under-review' | 'approved' | 'revisions-requested';

export interface ISubmissionVersion {
  versionNumber: number;
  fileUrl: string;
  checksum?: string;
  comments?: string;
  createdAt: Date;
}

export interface ISubmission {
  project: Schema.Types.ObjectId;
  milestoneType: string;
  student: Schema.Types.ObjectId;
  faculty?: Schema.Types.ObjectId;
  status: SubmissionStatus;
  versions: ISubmissionVersion[];
  rubricScores?: Record<string, number>;
  totalScore?: number;
}

export interface ISubmissionDocument extends ISubmission, Document {
  createdAt: Date;
  updatedAt: Date;
}

const submissionVersionSchema = new Schema<ISubmissionVersion>(
  {
    versionNumber: { type: Number, required: true },
    fileUrl: { type: String, required: true },
    checksum: { type: String },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const submissionSchema = new Schema<ISubmissionDocument>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    milestoneType: { type: String, required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['submitted', 'under-review', 'approved', 'revisions-requested'], default: 'submitted' },
    versions: { type: [submissionVersionSchema], default: [] },
    rubricScores: { type: Schema.Types.Mixed },
    totalScore: { type: Number }
  },
  {
    timestamps: true
  }
);

submissionSchema.index({ project: 1, milestoneType: 1 });

export const Submission: Model<ISubmissionDocument> = model<ISubmissionDocument>('Submission', submissionSchema);
