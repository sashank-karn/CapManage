import type { Request, Response } from 'express';
import { makeModuleRequirementHandler } from './moduleGenericController';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';

const MODULE = 'Module 4';

export const listModule4Requirements = makeModuleRequirementHandler(MODULE);

export const facultyDashboardPreview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(
    success({
      message: 'Faculty dashboard aggregation pending implementation.',
      todo: 'Implement submission list filters, rubric selection, and total score calculations per Module 4.'
    })
  );
});
