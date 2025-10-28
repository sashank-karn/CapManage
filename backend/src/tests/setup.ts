import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGO_URI = uri;
  process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret-very-long-string';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-very-long-string';
  process.env.FRONTEND_BASE_URL = 'http://localhost:3000';
  process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES = '30';
  process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES = '30';
  process.env.BCRYPT_SALT_ROUNDS = '4';

  await mongoose.connect(uri);
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) {
    return;
  }
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});
