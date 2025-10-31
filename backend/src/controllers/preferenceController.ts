import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { UserPreference } from '../models/UserPreference';
import { Types } from 'mongoose';

export const getNotificationPrefs = asyncHandler(async (req: Request, res: Response) => {
  const pref = await UserPreference.findOne({ user: req.currentUser!._id }).lean();
  const notifications = pref?.notifications || { mutedProjects: [] };
  res.json({ success: true, data: notifications });
});

export const saveNotificationPrefs = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body || {}) as { mutedProjects?: string[] };
  const mutedProjects = Array.isArray(body.mutedProjects)
    ? body.mutedProjects.filter((id) => typeof id === 'string' && id.length === 24).map((id) => new Types.ObjectId(id))
    : [];

  const pref = await UserPreference.findOneAndUpdate(
    { user: req.currentUser!._id },
    { $set: { notifications: { mutedProjects } } },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: pref.notifications });
});

export const muteProjectNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.body as { projectId: string };
  if (!projectId || projectId.length !== 24) {
    return res.status(400).json({ success: false, error: 'Valid projectId is required' });
  }
  const pref = await UserPreference.findOneAndUpdate(
    { user: req.currentUser!._id },
    { $addToSet: { 'notifications.mutedProjects': new Types.ObjectId(projectId) } },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: pref.notifications });
});

export const unmuteProjectNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.body as { projectId: string };
  if (!projectId || projectId.length !== 24) {
    return res.status(400).json({ success: false, error: 'Valid projectId is required' });
  }
  const pref = await UserPreference.findOneAndUpdate(
    { user: req.currentUser!._id },
    { $pull: { 'notifications.mutedProjects': new Types.ObjectId(projectId) } },
    { new: true }
  );
  res.json({ success: true, data: pref?.notifications || { mutedProjects: [] } });
});
