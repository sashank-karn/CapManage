import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { z } from 'zod';
import { authorize } from '../middleware/authorize';
import { validateRequest } from '../middleware/validateRequest';
import {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  activateUserHandler,
  deactivateUserHandler,
  deleteUserHandler
} from '../controllers/adminController';
import { createUserSchema, listUsersSchema, updateUserSchema, idParamSchema } from '../validators/adminValidators';
import { resendPasswordSetupHandler, resendVerificationHandler } from '../controllers/adminController';
import { listActivitiesHandler } from '../controllers/activityController';
import { getSummaryExcelHandler, getSummaryHandler, getSummaryPdfHandler, getUsersExcelHandler, getEvaluationsExcelHandler } from '../controllers/reportController';
import { adminEvaluationStats, adminEvaluationStatsExcel } from '../controllers/analyticsController';
import { listMySchedules, createSchedule, deleteSchedule } from '../controllers/reportScheduleController';
import { listFileEvents, fileEventsExcel, fileEventsCsv } from '../controllers/fileEventLogController';

const router = Router();

router.use(authenticate, authorize(['admin']));

router.get('/users', validateRequest(listUsersSchema), listUsersHandler);
router.post('/users', validateRequest(createUserSchema), createUserHandler);
router.patch('/users/:id', validateRequest(updateUserSchema), updateUserHandler);
router.post('/users/:id/activate', validateRequest(idParamSchema), activateUserHandler);
router.post('/users/:id/deactivate', validateRequest(idParamSchema), deactivateUserHandler);
router.delete('/users/:id', validateRequest(idParamSchema), deleteUserHandler);
router.post('/users/:id/resend-password-setup', validateRequest(idParamSchema), resendPasswordSetupHandler);
router.post('/users/:id/resend-verification', validateRequest(idParamSchema), resendVerificationHandler);

// Activity monitoring
router.get('/activities', ...listActivitiesHandler);

// Reports
router.get('/reports/summary', ...getSummaryHandler);
router.get('/reports/summary.pdf', ...getSummaryPdfHandler);
router.get('/reports/summary.xlsx', ...getSummaryExcelHandler);
router.get('/reports/users.xlsx', ...getUsersExcelHandler);
router.get('/reports/evaluations.xlsx', ...getEvaluationsExcelHandler);
router.get('/reports/evaluations/stats', ...adminEvaluationStats);
router.get('/reports/evaluations/stats.xlsx', ...adminEvaluationStatsExcel);

// File Event Logs (admin)
router.get('/file-events', listFileEvents);
router.get('/file-events.xlsx', fileEventsExcel);
router.get('/file-events.csv', fileEventsCsv);

// Report schedules (admin)
router.get('/reports/schedules', ...listMySchedules);
router.post(
  '/reports/schedules',
  validateRequest(z.object({ body: z.object({ type: z.literal('admin-dept-stats'), frequency: z.enum(['daily','weekly','monthly']), recipients: z.array(z.string().email()).optional() }) })),
  ...createSchedule
);
router.delete('/reports/schedules/:id', validateRequest(z.object({ params: z.object({ id: z.string().length(24) }) })), ...deleteSchedule);

export default router;
