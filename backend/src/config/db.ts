import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  const uri = env.NODE_ENV === 'test' && env.MONGO_URI_LOCAL ? env.MONGO_URI_LOCAL : env.MONGO_URI;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connection established');
  } catch (error) {
    console.error('MongoDB connection error', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
