import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      res.status(422).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 422,
          details: result.error.flatten()
        }
      });
      return;
    }

    Object.assign(req, result.data);
    next();
  };
};
