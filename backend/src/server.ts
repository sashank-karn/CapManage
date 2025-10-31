import app from './app';
import http from 'http';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { ensureDefaultAdmin } from './jobs/ensureAdmin';
import { initSocket } from './socket';
import { scheduleDeadlineReminders } from './jobs/deadlineReminders';
import { scheduleRiskAlerts } from './jobs/riskAlerts';
import { scheduleReportScheduler } from './jobs/reportScheduler';
import { scheduleBackups } from './jobs/backup';

const start = async (): Promise<void> => {
  await connectDatabase();
  await ensureDefaultAdmin();

  const server = http.createServer(app);
  initSocket(server);
  scheduleDeadlineReminders();
  scheduleRiskAlerts();
  scheduleReportScheduler();
  scheduleBackups();

  server.listen(env.port, () => {
    console.log(`CapManage API ready on port ${env.port}`);
  });
};

void start();
