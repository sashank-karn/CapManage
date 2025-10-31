import { Schema, model, type Document, type Model } from 'mongoose';

export type SubmissionStatus = 'submitted' | 'under-review' | 'approved' | 'revisions-requested';

export interface ISubmissionVersion {
  versionNumber: number;
  fileUrl: string; // path to encrypted file if enc is present; legacy plaintext path otherwise
  checksum?: string;
  comments?: string;
  createdAt: Date;
  // New metadata for secure storage
  originalName?: string;
  mimeType?: string;
  size?: number; // original plaintext size in bytes
  enc?: {
    algo: string; // e.g., 'aes-256-gcm'
    iv: string;   // base64-encoded IV
    tag: string;  // base64-encoded auth tag
    size: number; // encrypted size in bytes
  };
  virusScan?: {
    status: 'clean' | 'infected' | 'skipped' | 'error';
    engine?: string;
    scannedAt?: Date;
    details?: string;
  };
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
  revisionDueDate?: Date;
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
    createdAt: { type: Date, default: Date.now },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    enc: {
      type: new Schema(
        {
          algo: { type: String },
          iv: { type: String },
          tag: { type: String },
          size: { type: Number }
        },
        { _id: false }
      )
    },
    virusScan: {
      type: new Schema(
        {
          status: { type: String, enum: ['clean', 'infected', 'skipped', 'error'] },
          engine: { type: String },
          scannedAt: { type: Date },
          details: { type: String }
        },
        { _id: false }
      )
    }
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
    totalScore: { type: Number },
    revisionDueDate: { type: Date }
  },
  {
    timestamps: true
  }
);

submissionSchema.index({ project: 1, milestoneType: 1 });

export const Submission: Model<ISubmissionDocument> = model<ISubmissionDocument>('Submission', submissionSchema);
