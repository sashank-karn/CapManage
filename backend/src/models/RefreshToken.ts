import { Schema, model, type Document, type Model } from 'mongoose';

export interface IRefreshToken {
  user: Schema.Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdByIp?: string;
  revokedAt?: Date;
  revokedByIp?: string;
  replacedByToken?: string;
}

export interface IRefreshTokenDocument extends IRefreshToken, Document {
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String },
    revokedAt: { type: Date },
    revokedByIp: { type: String },
    replacedByToken: { type: String }
  },
  {
    timestamps: true
  }
);

refreshTokenSchema.index({ user: 1, token: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshTokenDocument> = model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);
