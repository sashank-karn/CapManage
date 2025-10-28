import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { makeModuleRequirementHandler } from './moduleGenericController';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import { Project } from '../models/Project';
import { Submission, type SubmissionStatus } from '../models/Submission';
import { Notification } from '../models/Notification';
import { ReportSnapshot } from '../models/ReportSnapshot';
import type { ApiError } from '../middleware/errorHandler';

const MODULE = 'Module2';

export const listModule2Requirements = makeModuleRequirementHandler(MODULE);

export const getStudentDashboardPreview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) {
    const err = new Error('Unauthorized') as ApiError;
    err.statusCode = 401;
    throw err;
  }

  const studentId = new Types.ObjectId(req.currentUser._id);

  const project = await Project.findOne({ students: studentId })
    .populate('faculty', 'name email')
    .lean()
    .exec();

  const [submissions, notifications, snapshots] = await Promise.all([
    Submission.find({ student: studentId })
      .populate('faculty', 'name')
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean()
      .exec(),
    Notification.find({ recipient: studentId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec(),
    ReportSnapshot.find({ owner: studentId, scope: 'student' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec()
  ]);

  const deadlines = (project?.milestones ?? [])
    .map((milestone, index) => {
      const dueDate = normalizeMilestoneDate(milestone?.dueDate);
      if (!dueDate) {
        return null;
      }

      return {
        id: `${project?._id?.toString() ?? 'milestone'}-${index}`,
        title: milestone.title,
        dueDate: dueDate.toISOString(),
        course: milestone.type !== 'custom' ? milestone.type : undefined
      };
    })
    // Narrow out nulls from the map above in a type-safe way
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .filter((item) => new Date(item.dueDate).getTime() >= Date.now())
    .slice(0, 6);

  const milestoneSummaries = (project?.milestones ?? []).map((milestone, index) => {
    const dueDate = normalizeMilestoneDate(milestone?.dueDate) ?? new Date();
    return {
      id: `${project?._id?.toString() ?? 'milestone'}-${index}`,
      title: milestone.title,
      status: mapMilestoneStatus(milestone.status, dueDate),
      dueDate: dueDate.toISOString()
    };
  });

  const submissionItems = submissions.map((submission) => ({
    id: submission._id.toString(),
    title: formatMilestoneLabel(submission.milestoneType),
    status: mapSubmissionStatus(submission.status),
    lastUpdated: submission.updatedAt?.toISOString() ?? submission.createdAt?.toISOString() ?? new Date().toISOString()
  }));

  const unreadNotifications = notifications.filter((notification) => isUnread(notification.meta)).length;
  const pendingSubmissions = submissionItems.filter((submission) => submission.status === 'pending').length;

  const activities = buildActivityTimeline(submissions, notifications);

  const feedback = submissions
    .filter((submission) => submission.faculty && submission.status !== 'approved')
    .slice(0, 6)
    .map((submission) => {
      const latestVersion = submission.versions?.[submission.versions.length - 1];
      return {
        id: submission._id.toString(),
        submission: formatMilestoneLabel(submission.milestoneType),
        faculty: (submission.faculty as { name?: string })?.name ?? 'Faculty reviewer',
        summary: latestVersion?.comments ?? describeSubmissionStatus(submission.status),
        timestamp: submission.updatedAt?.toISOString() ?? new Date().toISOString(),
        acknowledged: submission.status === 'approved'
      };
    });

  const notificationItems = notifications.map((notification) => ({
    id: notification._id.toString(),
    category: deriveNotificationCategory(notification),
    message: notification.message,
    createdAt: notification.createdAt?.toISOString() ?? new Date().toISOString(),
    read: !isUnread(notification.meta)
  }));

  const collaboration = buildCollaborationThread(submissions, snapshots, project);

  const completedMilestones = milestoneSummaries.filter((milestone) => milestone.status === 'completed').length;
  const inProgressMilestones = milestoneSummaries.filter((milestone) => milestone.status === 'in-progress').length;
  const pendingMilestones = milestoneSummaries.filter((milestone) => milestone.status === 'pending').length;
  const totalMilestones = milestoneSummaries.length || 1;
  const percentComplete = Math.round((completedMilestones / totalMilestones) * 100);

  res.json(
    success({
      project: project
        ? {
            id: project._id?.toString() ?? '',
            name: project.name,
            progressPercent: project.progressPercent ?? percentComplete,
            faculty: project.faculty
              ? {
                  name: (project.faculty as { name?: string })?.name ?? 'Faculty mentor',
                  email: (project.faculty as { email?: string })?.email
                }
              : undefined
          }
        : null,
      overview: {
        percentComplete,
        completedMilestones,
        inProgressMilestones,
        pendingMilestones,
        totalMilestones,
        unreadNotifications,
        pendingSubmissions,
        nextDeadline: deadlines[0] ?? null
      },
      deadlines,
      milestones: milestoneSummaries,
      activities,
      feedback,
      notifications: notificationItems,
      submissions: submissionItems,
      collaboration,
      generatedAt: new Date().toISOString()
    })
  );
});

const mapSubmissionStatus = (status: SubmissionStatus): 'pending' | 'reviewed' | 'accepted' | 'rejected' => {
  switch (status) {
    case 'submitted':
      return 'pending';
    case 'under-review':
      return 'reviewed';
    case 'approved':
      return 'accepted';
    case 'revisions-requested':
      return 'rejected';
    default:
      return 'pending';
  }
};

const describeSubmissionStatus = (status: SubmissionStatus): string => {
  switch (status) {
    case 'submitted':
      return 'Submission received and pending review.';
    case 'under-review':
      return 'Faculty is reviewing your submission.';
    case 'approved':
      return 'Submission approved. Great job!';
    case 'revisions-requested':
      return 'Revisions requested. Review updated notes to proceed.';
    default:
      return 'Submission status updated.';
  }
};

const formatMilestoneLabel = (milestoneType: string): string => {
  switch (milestoneType) {
    case 'synopsis':
      return 'Synopsis Submission';
    case 'midterm':
      return 'Midterm Evaluation';
    case 'final':
      return 'Final Defense';
    default:
      return milestoneType.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
};

const mapMilestoneStatus = (
  status: 'pending' | 'completed' | 'late' | undefined,
  dueDate: Date | null
): 'completed' | 'pending' | 'in-progress' => {
  if (status === 'completed') {
    return 'completed';
  }
  if (status === 'late') {
    return 'in-progress';
  }
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return 'pending';
  }
  if (dueDate.getTime() < Date.now()) {
    return 'in-progress';
  }
  return 'pending';
};

const isUnread = (meta: Record<string, unknown> | undefined): boolean => {
  if (!meta) return true;
  if (Object.prototype.hasOwnProperty.call(meta, 'read')) {
    const value = (meta as { read?: unknown }).read;
    return value !== true;
  }
  return true;
};

const deriveNotificationCategory = (
  notification: { message: string; meta?: Record<string, unknown> }
): 'deadline' | 'feedback' | 'activity' => {
  const meta = notification.meta as { category?: unknown } | undefined;
  const category = typeof meta?.category === 'string' ? meta.category.toLowerCase() : '';
  if (category === 'deadline' || category === 'feedback' || category === 'activity') {
    return category;
  }
  if (/deadline|due|submit/i.test(notification.message)) {
    return 'deadline';
  }
  if (/feedback|review/i.test(notification.message)) {
    return 'feedback';
  }
  return 'activity';
};

const buildActivityTimeline = (
  submissions: Array<Record<string, any>>,
  notifications: Array<{ message: string; meta?: Record<string, unknown> } & Record<string, any>>
) => {
  const submissionActivities = submissions.slice(0, 6).map((submission) => ({
    id: `submission-${submission._id.toString()}`,
    type: submission.status === 'revisions-requested' ? 'feedback' : 'submission',
    description: `${formatMilestoneLabel(submission.milestoneType)} ${describeSubmissionStatus(submission.status)}`,
    timestamp: submission.updatedAt?.toISOString() ?? new Date().toISOString()
  }));

  const notificationActivities = notifications.slice(0, 6).map((notification) => ({
    id: `notification-${notification._id.toString()}`,
    type: deriveNotificationCategory(notification) === 'feedback' ? 'feedback' : 'update',
    description: notification.message,
    timestamp: notification.createdAt?.toISOString() ?? new Date().toISOString()
  }));

  return [...submissionActivities, ...notificationActivities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);
};

const buildCollaborationThread = (
  submissions: Array<Record<string, any>>,
  snapshots: Array<Record<string, any>>,
  project: Record<string, any> | null
) => {
  const messages = submissions
    .flatMap((submission) => {
      const facultyName = (submission.faculty as { name?: string })?.name;
      return (submission.versions ?? [])
        // Explicitly annotate to avoid implicit any under strict settings
        .filter((version: any) => Boolean((version as any).comments))
        .map((version: any) => ({
          id: `${submission._id.toString()}-${(version as any).versionNumber ?? ''}`,
          sender: facultyName ? ('faculty' as const) : ('system' as const),
          author: facultyName ?? 'System update',
          message: (version as any).comments ?? '',
          timestamp:
            (version as any).createdAt?.toISOString?.() ??
            submission.updatedAt?.toISOString?.() ??
            new Date().toISOString()
        }));
    })
    .filter((msg) => msg.message.length > 0);

  const snapshotMessages = snapshots
    .map((snapshot) => ({
      id: `snapshot-${snapshot._id.toString()}`,
      sender: 'system' as const,
      author: 'Automated insight',
      message:
        typeof snapshot.payload?.summary === 'string'
          ? snapshot.payload.summary
          : 'New analytics snapshot available for your project.',
      timestamp: snapshot.generatedAt?.toISOString() ?? new Date().toISOString()
    }))
    .filter((snapshot) => snapshot.message.length > 0);

  const thread = [...messages, ...snapshotMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (thread.length === 0 && project?.faculty) {
    thread.push({
      id: 'faculty-welcome',
      sender: 'faculty',
      author: (project.faculty as { name?: string })?.name ?? 'Faculty mentor',
      message: 'Let me know if you need clarification on any Module 1 requirements or deliverables.',
      timestamp: new Date().toISOString()
    });
  }

  return thread.slice(-10);
};

const normalizeMilestoneDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};
