import api from './api';
import type { VersionInfo } from './submissions';

export type Milestone = 'synopsis' | 'mid-term' | 'final';

export interface FacultySubmissionItem {
  id: string;
  project: string;
  milestoneType: Milestone | string;
  student: string;
  studentEmail: string;
  status: 'submitted' | 'under-review' | 'approved' | 'revisions-requested';
  updatedAt: string;
  totalScore?: number | null;
  latestVersion?: {
    versionNumber: number;
    fileUrl: string;
    createdAt: string;
  } | null;
  revisionDueDate?: string | null;
}

export const fetchSubmissions = async (params: { milestone?: Milestone; search?: string; page?: number; limit?: number }) => {
  const res = await api.get('/faculty/submissions', { params });
  return res.data.data as { items: FacultySubmissionItem[]; total: number; page: number; limit: number };
};

export const postEvaluation = async (id: string, payload: { rubricScores?: Record<string, number>; comments?: string; status?: FacultySubmissionItem['status']; revisionDueDate?: string }) => {
  const res = await api.post(`/faculty/submissions/${id}/evaluate`, payload);
  return res.data.data as { id: string; totalScore?: number; status: FacultySubmissionItem['status']; revisionDueDate?: string | null };
};

export const RUBRIC_TEMPLATES: Record<string, Array<{ key: string; label: string; max: number }>> = {
  classic: [
    { key: 'clarity', label: 'Clarity', max: 10 },
    { key: 'originality', label: 'Originality', max: 10 },
    { key: 'presentation', label: 'Presentation', max: 10 }
  ]
};

export interface EvaluationHistoryItem {
  id: string;
  by: string;
  byEmail?: string;
  rubricScores: Record<string, number>;
  totalScore: number | null;
  comments: string;
  status: FacultySubmissionItem['status'];
  createdAt: string;
  revisionDueDate?: string | null;
}

export const fetchEvaluationHistory = async (submissionId: string) => {
  const res = await api.get(`/faculty/submissions/${submissionId}/history`);
  return res.data.data as EvaluationHistoryItem[];
};

export const fetchSubmissionVersions = async (submissionId: string) => {
  const res = await api.get(`/faculty/submissions/${submissionId}/versions`);
  return res.data.data as VersionInfo[];
};

// Notifications
export interface FacultyNotificationItem {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  sentAt?: string | null;
  module: string;
  meta?: Record<string, unknown>;
}

export const fetchNotifications = async () => {
  const res = await api.get('/faculty/notifications');
  return res.data.data as FacultyNotificationItem[];
};

export const markNotificationRead = async (id: string) => {
  const res = await api.post(`/faculty/notifications/${id}/read`);
  return res.data.data as FacultyNotificationItem;
};

// Preferences
export interface NotificationPrefs {
  mutedProjects: string[];
}

export const getNotificationPrefs = async () => {
  const res = await api.get('/faculty/preferences/notifications');
  return res.data.data as NotificationPrefs;
};

export const saveNotificationPrefs = async (prefs: NotificationPrefs) => {
  const res = await api.post('/faculty/preferences/notifications', prefs);
  return res.data.data as NotificationPrefs;
};

export const muteProjectNotifications = async (projectId: string) => {
  const res = await api.post('/faculty/preferences/notifications/mute', { projectId });
  return res.data.data as NotificationPrefs;
};

export const unmuteProjectNotifications = async (projectId: string) => {
  const res = await api.post('/faculty/preferences/notifications/unmute', { projectId });
  return res.data.data as NotificationPrefs;
};

// Faculty projects (for mute UI)
export interface FacultyProjectSummary {
  _id: string;
  name: string;
}

export const fetchFacultyProjects = async () => {
  const res = await api.get('/projects/faculty/projects');
  const items = (res.data.data as any[]).map((p) => ({ _id: p._id as string, name: (p.name as string) || '-' }));
  return items as FacultyProjectSummary[];
};

// Reports: Faculty progress
export interface FacultyProgressRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  projectId: string;
  projectName: string;
  totalMilestones: number;
  completedMilestones: number;
  completionPercent: number;
  lateCount: number;
}

export const fetchProgressReport = async (): Promise<FacultyProgressRow[]> => {
  const res = await api.get('/faculty/reports/progress');
  return (res.data.data?.items ?? []) as FacultyProgressRow[];
};

export const downloadProgressExcel = async (): Promise<void> => {
  const response = await api.get('/faculty/reports/progress.xlsx', { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = 'faculty-progress.xlsx';
  link.click();
  window.URL.revokeObjectURL(link.href);
};
