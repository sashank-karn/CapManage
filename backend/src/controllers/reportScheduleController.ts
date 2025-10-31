import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ReportSchedule } from '../models/ReportSchedule';
import { success } from '../utils/apiResponse';

export const listMySchedules = [
  asyncHandler(async (req: Request, res: Response) => {
    const items = await ReportSchedule.find({ user: req.currentUser!._id }).sort({ createdAt: -1 }).lean();
    res.json(success({ items }));
  })
];

export const createSchedule = [
  asyncHandler(async (req: Request, res: Response) => {
    const { type, frequency, recipients } = req.body as { type: string; frequency: 'daily'|'weekly'|'monthly'; recipients?: string[] };
    const now = new Date();
    const next = frequency === 'daily' ? new Date(now.getTime() + 24*60*60*1000)
      : frequency === 'weekly' ? new Date(now.getTime() + 7*24*60*60*1000)
      : new Date(new Date(now).setMonth(now.getMonth() + 1));
    const created = await ReportSchedule.create({ user: req.currentUser!._id, type, frequency, recipients: recipients || [], nextRunAt: next });
    res.json(success({ schedule: created }));
  })
];

export const deleteSchedule = [
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    await ReportSchedule.deleteOne({ _id: id, user: req.currentUser!._id });
    res.json(success({ ok: true }));
  })
];
