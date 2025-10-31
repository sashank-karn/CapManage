import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  // Try local first if provided, then fall back to primary MONGO_URI.
  // This avoids dev failures when local Mongo isn't running by using Atlas as fallback.
  const candidates: string[] = [];
  if (env.MONGO_URI_LOCAL && env.MONGO_URI_LOCAL.trim().length > 0) {
    candidates.push(env.MONGO_URI_LOCAL.trim());
  }
  if (env.MONGO_URI && env.MONGO_URI.trim().length > 0) {
    candidates.push(env.MONGO_URI.trim());
  }

  if (candidates.length === 0) {
    throw new Error('No MongoDB URI provided. Set MONGO_URI or MONGO_URI_LOCAL.');
  }

  let lastError: unknown = null;
  for (const uri of candidates) {
    try {
      // Use a short selection timeout so fallback happens quickly if the target is down
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB connection established: ${uri.includes('localhost') || uri.includes('127.0.0.1') ? 'local' : 'remote'}`);
      return;
    } catch (err) {
      lastError = err;
      console.warn(`MongoDB connection failed for ${uri}. Trying next candidate if available...`);
    }
  }

  console.error('MongoDB connection error', lastError);
  throw lastError as Error;
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
