import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import { getRequirementsByModule } from '../services/requirementService';
import { listFacultyRequests } from '../services/authService';
import { authorize } from '../middleware/authorize';

const MODULE_NAME = 'Module1';

export const listModule1Requirements = asyncHandler(async (_req: Request, res: Response) => {
  const requirements = await getRequirementsByModule(MODULE_NAME);
  res.json(success({ module: MODULE_NAME, requirements }));
});

export const listFacultyApprovalQueue = [
  authorize(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { status = 'pending' } = req.query as { status?: 'pending' | 'approved' | 'rejected' };
    const queue = await listFacultyRequests(status);
    res.json(success({ queue }));
  })
];
