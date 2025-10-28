import type { Request, Response } from 'express';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import {
  registerStudent,
  registerFaculty,
  verifyEmail,
  login,
  refreshSession,
  logout,
  requestPasswordReset,
  resetPassword,
  listFacultyRequests,
  updateFacultyRequestStatus
} from '../services/authService';
import { authorize } from '../middleware/authorize';

export const registerStudentHandler = asyncHandler(async (req: Request, res: Response) => {
  await registerStudent(req.body);
  res.status(201).json(success({ message: 'Registration initiated. Check your email to verify.' }));
});

export const registerFacultyHandler = asyncHandler(async (req: Request, res: Response) => {
  const request = await registerFaculty(req.body);
  res.status(202).json(success({ requestId: request._id.toString(), status: request.status }));
});

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  await verifyEmail(req.body.token);
  res.json(success({ message: 'Email verified successfully.' }));
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body.email, req.body.password, req.ip);
  res.json(success(result));
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await refreshSession(req.body.refreshToken, req.ip);
  res.json(success(result));
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  await logout(req.body.refreshToken, req.ip);
  res.json(success({ message: 'Logged out successfully.' }));
});

export const requestPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  await requestPasswordReset(req.body.email);
  res.json(success({ message: 'If an account exists for this email, a reset link has been sent.' }));
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await resetPassword(req.body.token, req.body.password);
  res.json(success({ message: 'Password updated successfully.' }));
});

export const listPendingFacultyRequestsHandler = [
  authorize(['admin']),
  asyncHandler(async (_req: Request, res: Response) => {
    const requests = await listFacultyRequests('pending');
    res.json(success({ requests }));
  })
];

export const updateFacultyRequestHandler = [
  authorize(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const request = await updateFacultyRequestStatus(req.params.id, req.body.status, req.currentUser!);
    res.json(success({ request }));
  })
];
