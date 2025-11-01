import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';
import {
  getDashboardSnapshot,
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  listNotifications,
  markNotificationRead,
  listMessages,
  sendMessage,
  getDashboardPrefs,
  saveDashboardPrefs,
  listEvaluations,
  listMyEvaluationHistory
} from '../controllers/studentController';
import { uploadSubmission, listSubmissionVersions, downloadSubmissionVersion, completeMilestone, previewSubmissionVersion, restoreSubmissionVersion } from '../controllers/submissionController';
import { studentSubmissionTimeline, studentSubmissionTimelineCsv, studentSubmissionTimelineExcel, studentSubmissionTimelinePdf } from '../controllers/analyticsController';
import { validateRequest as vr } from '../middleware/validateRequest';

const router = Router();

router.use(authenticate);

router.get('/dashboard/snapshot', getDashboardSnapshot);

// Todos
const todoCreateSchema = z.object({ body: z.object({ title: z.string().min(1), dueDate: z.string().datetime().optional() }) });
router.get('/todos', listTodos);
router.post('/todos', validateRequest(todoCreateSchema), createTodo);
const todoUpdateSchema = z.object({ params: z.object({ id: z.string().length(24) }), body: z.object({ title: z.string().min(1).optional(), completed: z.boolean().optional(), dueDate: z.string().datetime().optional() }) });
const idParamSchema = z.object({ params: z.object({ id: z.string().length(24) }) });
router.patch('/todos/:id', validateRequest(todoUpdateSchema), updateTodo);
router.delete('/todos/:id', validateRequest(idParamSchema), deleteTodo);

// Notifications
router.get('/notifications', listNotifications);
router.post('/notifications/:id/read', validateRequest(idParamSchema), markNotificationRead);

// Messages
router.get('/messages', listMessages);
router.post('/messages', validateRequest(z.object({ body: z.object({ text: z.string().min(1) }) })), sendMessage);

// Preferences
router.get('/preferences/dashboard', getDashboardPrefs);
router.post('/preferences/dashboard', validateRequest(z.object({ body: z.object({ order: z.array(z.string()), hidden: z.array(z.string()) }) })), saveDashboardPrefs);

// Submissions & Milestones
// Note: multipart/form-data fields are parsed by multer inside the controller.
// Do not use validateRequest here, as express doesn't parse multipart before multer runs.
router.post('/submissions/upload', uploadSubmission);
router.get(
  '/submissions/versions',
  vr(z.object({ query: z.object({ projectId: z.string().length(24), milestoneType: z.string().min(1), studentId: z.string().length(24).optional() }) })),
  listSubmissionVersions
);
router.get('/submissions/:id/versions/:version/download', vr(z.object({ params: z.object({ id: z.string().length(24), version: z.string() }) })), downloadSubmissionVersion);
router.get('/submissions/:id/versions/:version/preview', vr(z.object({ params: z.object({ id: z.string().length(24), version: z.string() }) })), previewSubmissionVersion);
router.post('/submissions/:id/versions/:version/restore', vr(z.object({ params: z.object({ id: z.string().length(24), version: z.string() }) })), restoreSubmissionVersion);
router.post(
  '/projects/milestones/complete',
  vr(z.object({ body: z.object({ projectId: z.string().length(24), milestoneType: z.string().min(1), notes: z.string().optional(), completedAt: z.string().optional() }) })),
  completeMilestone
);

// Evaluations
router.get('/evaluations', validateRequest(z.object({ query: z.object({ projectId: z.string().length(24).optional() }) })), listEvaluations);
router.get('/evaluations/:id/history', validateRequest(z.object({ params: z.object({ id: z.string().length(24) }) })), listMyEvaluationHistory);

// Reports: Student submission timeline
router.get('/reports/submissions/timeline', ...studentSubmissionTimeline);
router.get('/reports/submissions/timeline.csv', ...studentSubmissionTimelineCsv);
router.get('/reports/submissions/timeline.xlsx', ...studentSubmissionTimelineExcel);
router.get('/reports/submissions/timeline.pdf', ...studentSubmissionTimelinePdf);

export default router;
