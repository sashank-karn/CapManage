import { Schema, model, type Document, type Model } from 'mongoose';

export interface IDashboardPrefs {
  order: string[]; // widget ids order
  hidden: string[]; // widget ids hidden
}

export interface INotificationPrefs {
  mutedProjects: Schema.Types.ObjectId[];
}

export interface IUserPreference {
  user: Schema.Types.ObjectId;
  dashboard?: IDashboardPrefs;
  notifications?: INotificationPrefs;
}

export interface IUserPreferenceDocument extends IUserPreference, Document {
  createdAt: Date;
  updatedAt: Date;
}

const dashboardSchema = new Schema<IDashboardPrefs>(
  {
    order: { type: [String], default: [] },
    hidden: { type: [String], default: [] }
  },
  { _id: false }
);

const userPrefSchema = new Schema<IUserPreferenceDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dashboard: { type: dashboardSchema, default: () => ({}) },
    notifications: {
      type: new Schema<INotificationPrefs>(
        {
          mutedProjects: { type: [Schema.Types.ObjectId], ref: 'Project', default: [] }
        },
        { _id: false }
      ),
      default: () => ({})
    }
  },
  { timestamps: true }
);


export const UserPreference: Model<IUserPreferenceDocument> = model<IUserPreferenceDocument>('UserPreference', userPrefSchema);
