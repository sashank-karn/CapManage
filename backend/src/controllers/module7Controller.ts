import type { Request, Response } from 'express';
import { makeModuleRequirementHandler } from './moduleGenericController';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';

const MODULE = 'Module 7';

export const listModule7Requirements = makeModuleRequirementHandler(MODULE);

export const notificationPreview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(
    success({
      message: 'Notification scheduling pending implementation.',
      todo: 'Integrate cron-based reminders, in-app notifications, and targeted email delivery per Module 7.'
    })
  );
});
