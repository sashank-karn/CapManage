import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import { User } from '../models/User';
import { assertAccountStatus } from '../services/authService';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization || req.cookies?.accessToken;
    if (!authHeader) {
      res.status(401).json({ success: false, error: { message: 'Authorization required', code: 401 } });
      return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'User not found', code: 401 } });
      return;
    }

    assertAccountStatus(user);

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
