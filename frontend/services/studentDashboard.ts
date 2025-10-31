import api from './api';
import type { StudentDashboardSnapshot } from '../lib/studentDashboard';

export const fetchStudentDashboard = async (): Promise<StudentDashboardSnapshot> => {
  const { data } = await api.get('/student/dashboard/snapshot');
  return data.data as StudentDashboardSnapshot;
};

// Todos
export const getTodos = async () => {
  const { data } = await api.get('/student/todos');
  return data.data as Array<{ _id: string; title: string; completed: boolean; dueDate?: string }>;
};
export const createTodo = async (title: string, dueDate?: string) => {
  const { data } = await api.post('/student/todos', { title, dueDate });
  return data.data;
};
export const updateTodo = async (id: string, patch: { title?: string; completed?: boolean; dueDate?: string }) => {
  const { data } = await api.patch(`/student/todos/${id}`, patch);
  return data.data;
};
export const deleteTodo = async (id: string) => {
  const { data } = await api.delete(`/student/todos/${id}`);
  return data.data;
};

// Notifications
export const getNotifications = async () => {
  const { data } = await api.get('/student/notifications');
  return data.data as Array<{ _id: string; title: string; message: string; createdAt: string; sentAt?: string; module: string }>;
};
export const markNotificationRead = async (id: string) => {
  await api.post(`/student/notifications/${id}/read`);
};

// Messages
export const getMessages = async () => {
  const { data } = await api.get('/student/messages');
  return data.data as Array<{ _id: string; sender: string; text: string; createdAt: string }>; // server returns lean docs
};
export const sendMessage = async (text: string) => {
  const { data } = await api.post('/student/messages', { text });
  return data.data;
};

// Preferences
export const getDashboardPrefs = async () => {
  const { data } = await api.get('/student/preferences/dashboard');
  return data.data as { order: string[]; hidden: string[] };
};
export const saveDashboardPrefs = async (prefs: { order: string[]; hidden: string[] }) => {
  const { data } = await api.post('/student/preferences/dashboard', prefs);
  return data.data as { order: string[]; hidden: string[] };
};

// Reports
export type TimelineEvent = { type: 'due' | 'submitted' | 'evaluated'; at: string; project: string; milestone: string; meta?: Record<string, any> };
export const getSubmissionTimeline = async (): Promise<TimelineEvent[]> => {
  const { data } = await api.get('/student/reports/submissions/timeline');
  return (data.data?.events ?? []) as TimelineEvent[];
};
