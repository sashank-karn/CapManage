import { Schema, model, type Document, type Model } from 'mongoose';

export type MilestoneType = 'synopsis' | 'midterm' | 'final' | 'custom';

export interface IMilestone {
  title: string;
  dueDate: Date;
  type: MilestoneType;
  description?: string;
  status: 'pending' | 'completed' | 'late';
  completedAt?: Date;
  notes?: string;
}

export interface IProject {
  name: string;
  description?: string;
  students: Schema.Types.ObjectId[];
  faculty?: Schema.Types.ObjectId;
  milestones: IMilestone[];
  progressPercent: number;
}

export interface IProjectDocument extends IProject, Document {
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    type: { type: String, enum: ['synopsis', 'midterm', 'final', 'custom'], default: 'custom' },
    description: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'late'], default: 'pending' },
    completedAt: { type: Date },
    notes: { type: String }
  },
  { _id: false }
);

const projectSchema = new Schema<IProjectDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    students: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    faculty: { type: Schema.Types.ObjectId, ref: 'User' },
    milestones: { type: [milestoneSchema], default: [] },
    progressPercent: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ faculty: 1 });

export const Project: Model<IProjectDocument> = model<IProjectDocument>('Project', projectSchema);
