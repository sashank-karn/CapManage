import { Schema, model, type Document, type Model } from 'mongoose';

export interface IRequirement {
  moduleName: string;
  rawRowIndex: number;
  initiative?: string | null;
  epic?: string | null;
  feature?: string | null;
  userStory?: string | null;
  acceptanceCriteria?: string | null;
  priority?: string | null;
  estimate?: string | number | null;
  reasoning?: string | null;
  additional?: Record<string, unknown>;
}

export interface IRequirementDocument extends IRequirement, Document {
  createdAt: Date;
  updatedAt: Date;
}

const requirementSchema = new Schema<IRequirementDocument>(
  {
    moduleName: { type: String, required: true, index: true },
    rawRowIndex: { type: Number, required: true },
    initiative: { type: String },
    epic: { type: String },
    feature: { type: String },
    userStory: { type: String },
    acceptanceCriteria: { type: String },
    priority: { type: String },
    estimate: { type: Schema.Types.Mixed },
    reasoning: { type: String },
    additional: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true
  }
);

requirementSchema.index({ moduleName: 1, rawRowIndex: 1 }, { unique: true });

export const Requirement: Model<IRequirementDocument> = model<IRequirementDocument>('Requirement', requirementSchema);
