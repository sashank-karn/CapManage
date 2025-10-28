import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/User';

export const authorize = (roles: UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 401 } });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.currentUser.role)) {
      res.status(403).json({ success: false, error: { message: 'Forbidden', code: 403 } });
      return;
    }

    next();
  };
};
