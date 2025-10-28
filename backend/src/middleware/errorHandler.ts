import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface ApiError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const payload = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: status,
      details: env.NODE_ENV === 'development' ? err.details ?? err.stack : undefined
    }
  };

  res.status(status).json(payload);
};
