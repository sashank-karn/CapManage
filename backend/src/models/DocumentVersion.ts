import { Schema, model, type Document, type Model } from 'mongoose';

export interface IDocumentVersion {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  fileUrl: string;
  version: number;
  checksum?: string;
  sizeInBytes?: number;
  metadata?: Record<string, unknown>;
  uploadedAt: Date;
  isEncrypted: boolean;
  encryptionVersion: string;
}

export interface IDocumentVersionDocument extends IDocumentVersion, Document {
  createdAt: Date;
  updatedAt: Date;
}

const documentVersionSchema = new Schema<IDocumentVersionDocument>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String, required: true },
    version: { type: Number, required: true },
    checksum: { type: String },
    sizeInBytes: { type: Number },
    metadata: { type: Schema.Types.Mixed },
    uploadedAt: { type: Date, default: Date.now },
    isEncrypted: { type: Boolean, default: true },
    encryptionVersion: { type: String, default: 'aes-256-gcm' }
  },
  {
    timestamps: true
  }
);

documentVersionSchema.index({ project: 1, version: -1 }, { unique: true });

documentVersionSchema.index({ owner: 1 });

export const DocumentVersion: Model<IDocumentVersionDocument> = model<IDocumentVersionDocument>('DocumentVersion', documentVersionSchema);
