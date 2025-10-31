import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import {
  listUsers,
  createUser,
  updateUser,
  activateUserById,
  deactivateUserById,
  deleteUserById
} from '../services/adminService';
import { resendPasswordSetupById, resendVerificationEmailById } from '../services/adminService';

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, page, limit } = req.query as Record<string, string>;
  const result = await listUsers({
    search: search || undefined,
    role: (role as any) || undefined,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined
  });
  res.json(success(result));
});

export const createUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await createUser(req.body);
  res.status(201).json(success({ user }));
});

export const updateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateUser(req.params.id, req.body);
  res.json(success({ user }));
});

export const activateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await activateUserById(req.params.id);
  res.json(success({ user }));
});

export const deactivateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await deactivateUserById(req.params.id);
  res.json(success({ user }));
});

export const deleteUserHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteUserById(req.params.id);
  res.json(success({ message: 'User deleted' }));
});

export const resendPasswordSetupHandler = asyncHandler(async (req: Request, res: Response) => {
  await resendPasswordSetupById(req.params.id);
  res.json(success({ message: 'Password setup email sent' }));
});

export const resendVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  await resendVerificationEmailById(req.params.id);
  res.json(success({ message: 'Verification email sent' }));
});
