import app from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

const start = async (): Promise<void> => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`CapManage API ready on port ${env.port}`);
  });
};

void start();
