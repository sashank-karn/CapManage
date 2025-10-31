import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/User';

export const authorize = (roles: UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 401 } });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.currentUser.role)) {
      // Provide a more descriptive error to aid debugging role issues on the client
      res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: requires role ${roles.join(' or ')}`,
          code: 403,
          // Expose minimal diagnostics safely; omit in production if undesired
          details: {
            requiredRoles: roles,
            userRole: req.currentUser.role
          }
        }
      });
      return;
    }

    next();
  };
};
