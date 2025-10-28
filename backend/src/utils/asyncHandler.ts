import type { NextFunction, Request, Response, RequestHandler } from 'express';

export const asyncHandler = (handler: RequestHandler): RequestHandler => {
  const wrapped: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.resolve(handler(req, res, next));
    } catch (error) {
      next(error);
    }
  };

  return wrapped;
};
