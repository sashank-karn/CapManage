import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import dayjs from 'dayjs';
import type { ManipulateType } from 'dayjs';
import { env } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import type { IUserDocument } from '../models/User';

interface TokenPayload {
  sub: string;
  role: string;
  name: string;
}

const unitMap: Record<string, ManipulateType> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day'
};

const parseExpiry = (value: string): { amount: number; unit: ManipulateType } => {
  const match = value.trim().match(/^([0-9]+)([smhd])$/i);
  if (!match) {
    throw new Error(`Invalid token expiry format: ${value}`);
  }
  const amount = parseInt(match[1], 10);
  const unitKey = match[2].toLowerCase();
  const unit = unitMap[unitKey];
  if (!unit) {
    throw new Error(`Unsupported token expiry unit: ${unitKey}`);
  }
  return { amount, unit };
};

const accessExpiry = parseExpiry(env.ACCESS_TOKEN_EXPIRES_IN);
const refreshExpiry = parseExpiry(env.REFRESH_TOKEN_EXPIRES_IN);

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export const generateAccessToken = (user: IUserDocument): { token: string; expiresAt: Date } => {
  const expiresAt = dayjs().add(accessExpiry.amount, accessExpiry.unit).toDate();
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      name: user.name
    },
    env.ACCESS_TOKEN_SECRET as Secret,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn']
    }
  );

  return { token, expiresAt };
};

export const createRefreshToken = async (
  user: IUserDocument,
  createdByIp?: string
): Promise<{ token: string; expiresAt: Date }> => {
  const expiresAt = dayjs().add(refreshExpiry.amount, refreshExpiry.unit).toDate();
  const tokenId = crypto.randomUUID();

  await RefreshToken.create({
    user: user._id,
    token: tokenId,
    expiresAt,
    createdByIp
  });

  const signedToken = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      name: user.name,
      jti: tokenId
    },
    env.REFRESH_TOKEN_SECRET as Secret,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']
    }
  );

  return { token: signedToken, expiresAt };
};

export const generateTokenPair = async (
  user: IUserDocument,
  createdByIp?: string
): Promise<TokenPair> => {
  const { token: accessToken, expiresAt: accessTokenExpiresAt } = generateAccessToken(user);
  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await createRefreshToken(user, createdByIp);

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt
  };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET as Secret) as TokenPayload;
};

export const verifyRefreshToken = async (
  token: string
): Promise<TokenPayload & { tokenId: string }> => {
  const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET as Secret) as TokenPayload & { jti?: string };

  if (!payload.jti) {
    const error = new Error('Malformed refresh token');
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  const stored = await RefreshToken.findOne({ token: payload.jti });
  if (!stored || stored.revokedAt) {
    const error = new Error('Invalid refresh token');
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    const error = new Error('Refresh token expired');
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  return { sub: payload.sub, role: payload.role, name: payload.name, tokenId: stored.id };
};

export const revokeRefreshToken = async (token: string, revokedByIp?: string): Promise<void> => {
  const payload = jwt.decode(token) as { jti?: string } | null;
  const tokenId = payload?.jti;
  if (!tokenId) {
    return;
  }

  const stored = await RefreshToken.findOne({ token: tokenId });
  if (stored) {
    stored.revokedAt = new Date();
    stored.revokedByIp = revokedByIp;
    await stored.save();
  }
};

export const revokeRefreshTokenById = async (id: string, revokedByIp?: string): Promise<void> => {
  const stored = await RefreshToken.findById(id);
  if (stored) {
    stored.revokedAt = new Date();
    stored.revokedByIp = revokedByIp;
    await stored.save();
  }
};
