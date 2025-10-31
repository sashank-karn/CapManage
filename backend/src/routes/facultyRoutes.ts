import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateRequest } from '../middleware/validateRequest';
import { listSubmissions, evaluateSubmission, listEvaluationHistory, listSubmissionVersionsById } from '../controllers/facultyController';
import { restoreSubmissionVersion } from '../controllers/submissionController';
import { listNotifications, markNotificationRead } from '../controllers/studentController';
import { getNotificationPrefs, saveNotificationPrefs, muteProjectNotifications, unmuteProjectNotifications } from '../controllers/preferenceController';
import { facultyProgress, facultyProgressExcel, facultyTrends } from '../controllers/analyticsController';
import { listMySchedules, createSchedule, deleteSchedule } from '../controllers/reportScheduleController';

const router = Router();

router.use(authenticate);
router.use(authorize(['faculty']));

router.get('/submissions', listSubmissions);

const evaluateSchema = z.object({
  params: z.object({ id: z.string().length(24) }),
  body: z.object({
    rubricScores: z.record(z.number()).optional(),
    comments: z.string().optional(),
    status: z.enum(['submitted', 'under-review', 'approved', 'revisions-requested']).optional(),
    revisionDueDate: z.string().optional()
  })
});

router.post('/submissions/:id/evaluate', validateRequest(evaluateSchema), evaluateSubmission);

const idParam = z.object({ params: z.object({ id: z.string().length(24) }) });
router.get('/submissions/:id/history', validateRequest(idParam), listEvaluationHistory);
router.get('/submissions/:id/versions', validateRequest(idParam), listSubmissionVersionsById);
router.post('/submissions/:id/versions/:version/restore', validateRequest(z.object({ params: z.object({ id: z.string().length(24), version: z.string() }) })), restoreSubmissionVersion);

// Notifications (faculty)
router.get('/notifications', listNotifications);
router.post('/notifications/:id/read', validateRequest(idParam), markNotificationRead);

// Notification preferences (faculty)
router.get('/preferences/notifications', getNotificationPrefs);
router.post(
  '/preferences/notifications',
  validateRequest(
    z.object({
      body: z.object({ mutedProjects: z.array(z.string().length(24)).optional() })
    })
  ),
  saveNotificationPrefs
);
router.post(
  '/preferences/notifications/mute',
  validateRequest(z.object({ body: z.object({ projectId: z.string().length(24) }) })),
  muteProjectNotifications
);
router.post(
  '/preferences/notifications/unmute',
  validateRequest(z.object({ body: z.object({ projectId: z.string().length(24) }) })),
  unmuteProjectNotifications
);

// Reports & Analytics
router.get('/reports/progress', ...facultyProgress);
router.get('/reports/progress.xlsx', ...facultyProgressExcel);
router.get('/reports/trends', ...facultyTrends);

// Report schedules (faculty)
router.get('/reports/schedules', ...listMySchedules);
router.post(
  '/reports/schedules',
  validateRequest(z.object({ body: z.object({ type: z.literal('faculty-progress'), frequency: z.enum(['daily','weekly','monthly']), recipients: z.array(z.string().email()).optional() }) })),
  ...createSchedule
);
router.delete('/reports/schedules/:id', validateRequest(z.object({ params: z.object({ id: z.string().length(24) }) })), ...deleteSchedule);

export default router;
