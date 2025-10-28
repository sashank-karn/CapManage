import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type FacultyRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IFacultyRequest {
  user: Types.ObjectId;
  department: string;
  designation: string;
  expertise?: string;
  status: FacultyRequestStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  notes?: string;
}

export interface IFacultyRequestDocument extends IFacultyRequest, Document<Types.ObjectId> {
  _id: Types.ObjectId;
}

const facultyRequestSchema = new Schema<IFacultyRequestDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    expertise: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  },
  {
    timestamps: true
  }
);

export const FacultyRequest: Model<IFacultyRequestDocument> = model<IFacultyRequestDocument>('FacultyRequest', facultyRequestSchema);
