import { ActivityLog, ActivityType, IActivityLogDocument } from '../models/ActivityLog';
import { Types } from 'mongoose';

interface LogInput {
  type: ActivityType;
  userId: string | Types.ObjectId;
  actorId?: string | Types.ObjectId;
  message: string;
  meta?: Record<string, unknown>;
}

export const logActivity = async (input: LogInput): Promise<IActivityLogDocument> => {
  return ActivityLog.create({
    type: input.type,
    user: new Types.ObjectId(input.userId),
    actor: input.actorId ? new Types.ObjectId(input.actorId) : undefined,
    message: input.message,
    meta: input.meta
  });
};

export const listActivities = async (
  {
    type,
    page = 1,
    limit = 20
  }: { type?: ActivityType; page?: number; limit?: number }
) => {
  const query: Record<string, unknown> = {};
  if (type) query.type = type;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role')
      .populate('actor', 'name email role'),
    ActivityLog.countDocuments(query)
  ]);
  return { items, total, page, limit };
};
