import { Schema, model, type Document, type Model } from 'mongoose';

export interface IMessage {
  project?: Schema.Types.ObjectId;
  participants: Schema.Types.ObjectId[]; // student and faculty ids
  sender: Schema.Types.ObjectId; // who sent it
  text: string;
}

export interface IMessageDocument extends IMessage, Document {
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

messageSchema.index({ project: 1, createdAt: -1 });
messageSchema.index({ participants: 1, createdAt: -1 });

export const Message: Model<IMessageDocument> = model<IMessageDocument>('Message', messageSchema);
