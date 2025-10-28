import type { Request, Response } from 'express';
import { makeModuleRequirementHandler } from './moduleGenericController';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';

const MODULE = 'Module 8';

export const listModule8Requirements = makeModuleRequirementHandler(MODULE);

export const reportsPreview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(
    success({
      message: 'Reports & analytics pipeline pending.',
      todo: 'Implement real-time submission timelines, export features, and role-based visibility per Module 8.'
    })
  );
});
