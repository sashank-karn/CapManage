import type { IUserDocument } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      currentUser?: IUserDocument;
      refreshTokenId?: string;
    }
  }
}

export {};
