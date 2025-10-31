import { Schema, model, type Document, type Model } from 'mongoose';

export interface ITodo {
  user: Schema.Types.ObjectId;
  title: string;
  completed: boolean;
  dueDate?: Date;
}

export interface ITodoDocument extends ITodo, Document {
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<ITodoDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date }
  },
  { timestamps: true }
);

todoSchema.index({ user: 1, completed: 1, dueDate: 1 });

export const Todo: Model<ITodoDocument> = model<ITodoDocument>('Todo', todoSchema);
