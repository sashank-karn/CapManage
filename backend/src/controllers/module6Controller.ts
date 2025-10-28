import type { Request, Response } from 'express';
import { makeModuleRequirementHandler } from './moduleGenericController';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';

const MODULE = 'Module 6';

export const listModule6Requirements = makeModuleRequirementHandler(MODULE);

export const evaluationToolsPreview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(
    success({
      message: 'Evaluation tools service pending full build-out.',
      todo: 'Implement rubric grading, milestone filtering, and faculty feedback workflows per Module 6.'
    })
  );
});
