import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { listActivities } from '../services/activityService';
import { success } from '../utils/apiResponse';

export const listActivitiesHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    const { type, page = '1', limit = '20' } = req.query as {
      type?: any;
      page?: string;
      limit?: string;
    };
    const result = await listActivities({ type, page: Number(page), limit: Number(limit) });
    res.json(success(result));
  })
];
