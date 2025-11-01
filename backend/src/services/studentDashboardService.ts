import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { Submission } from '../models/Submission';
import { Notification } from '../models/Notification';
import { Message } from '../models/Message';
import { ActivityLog } from '../models/ActivityLog';

export const buildStudentDashboardSnapshot = async (userId: string) => {
  const uid = new Types.ObjectId(userId);

  // Project and milestones
  const project = await Project.findOne({ students: uid }).populate('faculty', 'name email').lean();

  const milestones = (project?.milestones || []).map((m) => ({
    id: `${project?._id}-${m.title}`,
    title: m.title,
    status: (m.status === 'completed' ? 'completed' : m.status === 'pending' ? 'pending' : 'in-progress') as 'completed' | 'pending' | 'in-progress',
    dueDate: m.dueDate.toISOString()
  }));

  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const inProgressMilestones = milestones.filter((m) => m.status === 'in-progress').length;
  const pendingMilestones = milestones.filter((m) => m.status === 'pending').length;
  const totalMilestones = milestones.length;

  const upcoming = (project?.milestones || [])
    .filter((m) => dayjs(m.dueDate).isAfter(dayjs().subtract(1, 'day')) && m.status !== 'completed')
    .sort((a, b) => +a.dueDate - +b.dueDate)
    .slice(0, 5)
    .map((m) => ({ id: `${project?._id}-${m.title}`, title: m.title, dueDate: m.dueDate.toISOString() }));

  // Include revision due dates from submissions, if any
  const revisionSubs = await Submission.find({ student: uid, status: 'revisions-requested', revisionDueDate: { $ne: null } })
    .sort({ revisionDueDate: 1 })
    .limit(5)
    .lean();
  const revisionDeadlines = revisionSubs
    .filter((s) => s.revisionDueDate && dayjs(s.revisionDueDate as Date).isAfter(dayjs().subtract(1, 'day')))
    .map((s) => ({ id: `rev-${s._id.toString()}`, title: `Revision due: ${s.milestoneType}` as string, dueDate: (s.revisionDueDate as Date).toISOString() }));

  // Merge and take soonest 5 items
  const deadlinesMerged = [...upcoming, ...revisionDeadlines]
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
    .slice(0, 5);

  // Submissions
  const submissions = await Submission.find({ student: uid }).sort({ updatedAt: -1 }).limit(10).lean();
  const submissionItems = submissions.map((s) => ({
    id: s._id.toString(),
    title: s.milestoneType,
    status: (s.status === 'submitted' ? 'pending' : s.status === 'under-review' ? 'reviewed' : s.status === 'approved' ? 'accepted' : 'rejected') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
    lastUpdated: s.updatedAt.toISOString()
  }));

  // Activities
  const activitiesLog = await ActivityLog.find({ user: uid }).sort({ createdAt: -1 }).limit(10).populate('actor', 'name').lean();
  const activities = activitiesLog.map((a) => ({
    id: a._id.toString(),
    type: (a.type === 'email-verification' ? 'update' : a.type.includes('approve') || a.type.includes('reject') ? 'feedback' : 'submission') as 'submission' | 'feedback' | 'update',
    description: a.message,
    timestamp: (a.createdAt ? a.createdAt : new Date()).toISOString()
  }));

  // Feedback (extract from submissions with comments on latest version)
  const feedback = submissions
    .map((s) => {
      const latestWithComment = [...(s.versions || [])].reverse().find((v) => !!v.comments);
      if (!latestWithComment) return null;
      return {
        id: `${s._id}-fb`,
        submission: s.milestoneType,
        faculty: project?.faculty ? (project.faculty as any).name : 'Faculty',
        summary: latestWithComment.comments || '',
        timestamp: latestWithComment.createdAt.toISOString(),
        acknowledged: false
      };
    })
    .filter(Boolean) as any[];

  // Notifications for student
  const notificationsDocs = await Notification.find({ recipient: uid }).sort({ createdAt: -1 }).limit(10).lean();
  const notifications = notificationsDocs.map((n) => ({
    id: n._id.toString(),
    category: (n.module === 'deadline' ? 'deadline' : n.module === 'feedback' ? 'feedback' : 'activity') as 'deadline' | 'feedback' | 'activity',
    message: n.message,
    createdAt: n.createdAt.toISOString(),
    read: !!n.sentAt
  }));

  // Messages
  const messagesDocs = await Message.find({ participants: uid }).sort({ createdAt: -1 }).limit(10).populate('sender', 'name role').lean();
  const messages = messagesDocs
    .reverse()
    .map((m) => ({
      id: m._id.toString(),
      sender: (m.sender as any).role === 'faculty' ? 'faculty' : (m.sender as any).role === 'student' ? 'student' : 'system',
      author: (m.sender as any).name || 'System',
      message: m.text,
      timestamp: m.createdAt.toISOString()
    }));

  // Overview
  const pendingSubmissions = submissionItems.filter((s) => s.status === 'pending').length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const nextDeadline = (deadlinesMerged[0] as any) || null;

  return {
    project: project
      ? {
          id: project._id.toString(),
          name: project.name,
          progressPercent: project.progressPercent || Math.round((completedMilestones / Math.max(1, totalMilestones)) * 100),
          faculty: project.faculty ? { name: (project.faculty as any).name, email: (project.faculty as any).email } : undefined
        }
      : null,
    overview: {
      percentComplete: project?.progressPercent || Math.round((completedMilestones / Math.max(1, totalMilestones)) * 100),
      completedMilestones,
      inProgressMilestones,
      pendingMilestones,
      totalMilestones,
      unreadNotifications,
      pendingSubmissions,
      nextDeadline
    },
  deadlines: deadlinesMerged,
    milestones,
    activities,
    feedback,
    notifications,
    submissions: submissionItems,
    collaboration: messages,
    generatedAt: new Date().toISOString()
  };
};
