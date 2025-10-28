import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import { getRequirementsByModule } from '../services/requirementService';

export const makeModuleRequirementHandler = (moduleName: string) =>
  asyncHandler(async (_req: Request, res: Response) => {
    const requirements = await getRequirementsByModule(moduleName);
    res.json(success({ module: moduleName, requirements }));
  });
