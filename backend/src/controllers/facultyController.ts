import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { Submission } from '../models/Submission';
import { Project } from '../models/Project';
import { Notification } from '../models/Notification';
import { EvaluationHistory } from '../models/EvaluationHistory';
import { User } from '../models/User';
import { sendMail } from '../utils/mailer';
import { env } from '../config/env';

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.currentUser!._id;
  const milestone = (req.query.milestone as string | undefined) || undefined;
  const search = (req.query.search as string | undefined)?.trim();
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

  // Projects supervised by this faculty
  const projects = await Project.find({ faculty: new Types.ObjectId(facultyId) }, { _id: 1 }).lean();
  const projectIds = projects.map((p) => p._id);

  const query: any = { project: { $in: projectIds } };
  if (milestone) query.milestoneType = milestone;

  if (search) {
    // Populate student to filter by name/email, using a two-step approach
    const studentMatch: any = { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] };
    const studentIds = await Project.db.collection('users').find(studentMatch, { projection: { _id: 1 } }).toArray();
    const idSet = new Set(studentIds.map((s) => s._id));
    query.student = { $in: Array.from(idSet) };
  }

  const total = await Submission.countDocuments(query);
  const items = await Submission.find(query)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('student', 'name email')
    .populate('project', 'name')
    .lean();

  const mapped = items.map((s) => ({
    id: (s._id as any).toString(),
  project: (s.project as any)?.name || '-',
    milestoneType: s.milestoneType,
    student: (s.student as any)?.name || '-',
    studentEmail: (s.student as any)?.email || '-',
    status: s.status,
    updatedAt: s.updatedAt,
    latestVersion: s.versions?.length ? s.versions[s.versions.length - 1] : null,
    totalScore: s.totalScore ?? null,
    revisionDueDate: (s as any).revisionDueDate ?? null
  }));

  res.json({ success: true, data: { items: mapped, total, page, limit } });
});

export const evaluateSubmission = asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.currentUser!._id;
  const { id } = req.params;
  const { rubricScores, comments, status, revisionDueDate } = req.body as { rubricScores?: Record<string, number>; comments?: string; status?: string; revisionDueDate?: string };

  const submission = await Submission.findById(id).populate('project').lean(false);
  if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

  // Ensure ownership
  const proj = submission.project as any;
  if (!proj || (proj.faculty?.toString?.() || proj.faculty) !== facultyId.toString()) {
    return res.status(403).json({ success: false, error: 'Not allowed' });
  }

  // Prevent edits after final lock (approved)
  const isLocked = submission.status === 'approved';
  if (isLocked && (rubricScores || comments || (status && status !== 'approved') || revisionDueDate)) {
    return res.status(409).json({ success: false, error: 'Evaluation is locked after approval. You cannot modify it.' });
  }

  if (rubricScores) {
    submission.rubricScores = rubricScores as any;
    submission.totalScore = Object.values(rubricScores).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    // Cast due to differing ObjectId typings between mongoose and @types/mongodb
    (submission as any).faculty = new Types.ObjectId(facultyId);
  }

  if (comments) {
    if (submission.versions && submission.versions.length) {
      submission.versions[submission.versions.length - 1].comments = comments;
    }
  }

  if (status && ['submitted', 'under-review', 'approved', 'revisions-requested'].includes(status)) {
    submission.status = status as any;
    if (status === 'revisions-requested') {
      if (revisionDueDate) {
        const due = new Date(revisionDueDate);
        if (!isNaN(due.getTime())) {
          (submission as any).revisionDueDate = due;
        }
      }
    } else {
      // Clear due date when no longer in revisions state
      (submission as any).revisionDueDate = undefined;
    }
  }

  await submission.save();

  try {
    await Notification.create({
      recipient: submission.student as any,
      title: 'Submission evaluated',
      message: `Your ${submission.milestoneType} has been evaluated.${submission.status === 'revisions-requested' && (submission as any).revisionDueDate ? ` Revisions due by ${(submission as any).revisionDueDate.toDateString()}.` : ''}`,
      channel: ['in-app'],
      module: 'faculty'
    });
  } catch {}

  try {
    await EvaluationHistory.create({
      submission: submission._id as any,
      faculty: facultyId as any,
      rubricScores: submission.rubricScores as any,
      totalScore: submission.totalScore,
      comments: submission.versions?.length ? submission.versions[submission.versions.length - 1].comments : undefined,
      status: submission.status,
      revisionDueDate: (submission as any).revisionDueDate
    });
  } catch {}

  // Email student a summary (best-effort, non-blocking)
  try {
    const [studentUser, facultyUser, proj] = await Promise.all([
      User.findById(submission.student).lean(),
      User.findById((submission.project as any)?.faculty).lean(),
      Project.findById((submission.project as any)?._id || submission.project).lean()
    ]);
    if (studentUser?.email) {
      const due = (submission as any).revisionDueDate as Date | undefined;
      const subject = `Submission evaluated: ${proj?.name || 'Project'} • ${submission.milestoneType}`;
      const html = `
        <p>Hi ${studentUser.name || 'Student'},</p>
        <p>Your submission has been evaluated by ${facultyUser?.name || 'your faculty'}.</p>
        <ul>
          <li><strong>Project:</strong> ${proj?.name || '-'}</li>
          <li><strong>Milestone:</strong> ${submission.milestoneType}</li>
          <li><strong>Status:</strong> ${submission.status}</li>
          ${typeof submission.totalScore === 'number' ? `<li><strong>Total Score:</strong> ${submission.totalScore}</li>` : ''}
          ${due ? `<li><strong>Revisions due by:</strong> ${new Date(due).toDateString()}</li>` : ''}
        </ul>
        <p><a href="${env.FRONTEND_BASE_URL}/student/evaluations">Open your evaluations</a></p>
        <p>— CapManage</p>
      `;
      await sendMail({ to: studentUser.email, subject, html });
    }
  } catch (e) {
    console.warn('Evaluation email notification failed (ignored).');
  }

  res.json({ success: true, data: { id: (submission._id as any).toString(), totalScore: submission.totalScore, status: submission.status, revisionDueDate: (submission as any).revisionDueDate ?? null } });
});

export const listEvaluationHistory = asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.currentUser!._id.toString();
  const { id } = req.params; // submission id

  const submission = await Submission.findById(id).populate('project').lean();
  if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });
  const proj = submission.project as any;
  if (!proj || (proj.faculty?.toString?.() || proj.faculty) !== facultyId) {
    return res.status(403).json({ success: false, error: 'Not allowed' });
  }

  const history = await EvaluationHistory.find({ submission: new Types.ObjectId(id) })
    .sort({ createdAt: -1 })
    .populate('faculty', 'name email')
    .lean();

  const items = history.map((h) => ({
    id: (h._id as any).toString(),
    by: (h.faculty as any)?.name || 'Faculty',
    byEmail: (h.faculty as any)?.email || '',
    rubricScores: h.rubricScores || {},
    totalScore: h.totalScore ?? null,
    comments: h.comments || '',
    status: h.status || 'under-review',
    createdAt: h.createdAt,
    revisionDueDate: (h as any).revisionDueDate ?? null
  }));

  res.json({ success: true, data: items });
});

export const listSubmissionVersionsById = asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.currentUser!._id.toString();
  const { id } = req.params; // submission id

  const submission = await Submission.findById(id).populate('project').lean();
  if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });
  const proj = submission.project as any;
  if (!proj || (proj.faculty?.toString?.() || proj.faculty) !== facultyId) {
    return res.status(403).json({ success: false, error: 'Not allowed' });
  }

  const versions = (submission.versions || []).map((v) => ({
    versionNumber: v.versionNumber,
    createdAt: v.createdAt,
    checksum: (v as any).checksum
  }));

  res.json({ success: true, data: versions });
});
