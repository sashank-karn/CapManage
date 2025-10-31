import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { buildStudentDashboardSnapshot } from '../services/studentDashboardService';
import { Todo } from '../models/Todo';
import { Notification } from '../models/Notification';
import { Message } from '../models/Message';
import { Project } from '../models/Project';
import { Types } from 'mongoose';
import { getIO } from '../socket';
import { UserPreference } from '../models/UserPreference';
import { Submission } from '../models/Submission';
import { EvaluationHistory } from '../models/EvaluationHistory';

export const getDashboardSnapshot = asyncHandler(async (req: Request, res: Response) => {
  const snapshot = await buildStudentDashboardSnapshot(req.currentUser!._id.toString());
  res.json({ success: true, data: snapshot });
});

// Todos CRUD
export const listTodos = asyncHandler(async (req: Request, res: Response) => {
  const items = await Todo.find({ user: req.currentUser!._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

export const createTodo = asyncHandler(async (req: Request, res: Response) => {
  const { title, dueDate } = req.body as { title: string; dueDate?: string };
  const todo = await Todo.create({ user: req.currentUser!._id, title, dueDate: dueDate ? new Date(dueDate) : undefined });
  res.status(201).json({ success: true, data: todo });
});

export const updateTodo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, completed, dueDate } = req.body as { title?: string; completed?: boolean; dueDate?: string };
  const todo = await Todo.findOneAndUpdate(
    { _id: id, user: req.currentUser!._id },
    { $set: { ...(title !== undefined ? { title } : {}), ...(completed !== undefined ? { completed } : {}), ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : undefined } : {}) } },
    { new: true }
  );
  res.json({ success: true, data: todo });
});

export const deleteTodo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await Todo.deleteOne({ _id: id, user: req.currentUser!._id });
  res.json({ success: true, data: true });
});

// Notifications
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const items = await Notification.find({ recipient: req.currentUser!._id }).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ success: true, data: items });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const n = await Notification.findOneAndUpdate({ _id: id, recipient: req.currentUser!._id }, { $set: { sentAt: new Date() } }, { new: true });
  res.json({ success: true, data: n });
});

// Messages
export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const items = await Message.find({ participants: req.currentUser!._id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, data: items.reverse() });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id;
  const text = (req.body?.text as string) || '';
  if (!text.trim()) return res.status(400).json({ success: false, error: 'Message text required' });

  // Determine project and participants (student + faculty)
  const project = await Project.findOne({ students: new Types.ObjectId(userId) }).lean();
  const participants = project?.faculty
    ? [new Types.ObjectId(userId), new Types.ObjectId(project.faculty as any)]
    : [new Types.ObjectId(userId)];

  const msg = await Message.create({ project: project?._id, participants, sender: userId, text });

  try {
    const io = getIO();
    for (const p of participants) {
      io.to(`user:${p.toString()}`).emit('message:new', {
        id: (msg._id as any).toString(),
        text: msg.text,
        sender: userId.toString(),
        createdAt: msg.createdAt
      });
    }
  } catch {}

  res.status(201).json({ success: true, data: msg });
});

// Preferences
export const getDashboardPrefs = asyncHandler(async (req: Request, res: Response) => {
  const pref = await UserPreference.findOne({ user: req.currentUser!._id }).lean();
  res.json({ success: true, data: pref?.dashboard || { order: [], hidden: [] } });
});

export const saveDashboardPrefs = asyncHandler(async (req: Request, res: Response) => {
  const { order, hidden } = req.body as { order: string[]; hidden: string[] };
  const pref = await UserPreference.findOneAndUpdate(
    { user: req.currentUser!._id },
    { $set: { dashboard: { order: order || [], hidden: hidden || [] } } },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: pref.dashboard });
});

// Evaluations summary for the current student
export const listEvaluations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const projectId = (req.query.projectId as string | undefined)?.trim();
  const query: any = { student: req.currentUser!._id };
  if (projectId) query.project = new Types.ObjectId(projectId);

  const items = await Submission.find(query)
    .populate('project', 'name')
    .sort({ updatedAt: -1 })
    .lean();

  const mapped = items.map((s: any) => ({
    id: s._id.toString(),
    project: s.project?.name || '-',
    milestoneType: s.milestoneType,
    status: s.status,
    totalScore: s.totalScore ?? null,
    revisionDueDate: s.revisionDueDate ?? null,
    comments: s.versions?.length ? s.versions[s.versions.length - 1].comments || '' : ''
  }));
  res.json({ success: true, data: mapped });
});

// Evaluation history for a submission (student only)
export const listMyEvaluationHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // submission id
  const sub = await Submission.findById(id).lean();
  if (!sub) return res.status(404).json({ success: false, error: 'Submission not found' });
  if (sub.student.toString() !== req.currentUser!._id.toString()) {
    return res.status(403).json({ success: false, error: 'Not allowed' });
  }

  const history = await EvaluationHistory.find({ submission: sub._id })
    .sort({ createdAt: -1 })
    .populate('faculty', 'name email')
    .lean();

  const items = history.map((h: any) => ({
    id: h._id.toString(),
    by: h.faculty?.name || 'Faculty',
    byEmail: h.faculty?.email || '',
    rubricScores: h.rubricScores || {},
    totalScore: h.totalScore ?? null,
    comments: h.comments || '',
    status: h.status || 'under-review',
    createdAt: h.createdAt,
    revisionDueDate: h.revisionDueDate ?? null
  }));
  res.json({ success: true, data: items });
});
