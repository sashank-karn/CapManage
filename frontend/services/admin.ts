import api from './api';
import type { AuthUser } from './auth';

export interface AdminUserListItem {
  _id: string;
  name: string;
  email: string;
  role: AuthUser['role'];
  isActive: boolean;
  isEmailVerified: boolean;
  facultyStatus?: 'pending' | 'approved' | 'rejected';
}

export const fetchUsers = async (params?: { search?: string; role?: AdminUserListItem['role']; page?: number; limit?: number }) => {
  const { data } = await api.get('/admin/users', { params });
  return data.data as { items: AdminUserListItem[]; total: number };
};

export const createUser = async (payload: {
  name: string;
  email: string;
  role: AdminUserListItem['role'];
  enrollmentId?: string;
  department?: string;
  designation?: string;
  expertise?: string;
}) => {
  const { data } = await api.post('/admin/users', payload);
  return data.data as { user: AdminUserListItem };
};

export const updateUser = async (id: string, payload: Partial<Pick<AdminUserListItem, 'name' | 'email' | 'role' | 'isActive'>>) => {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data.data as { user: AdminUserListItem };
};

export const activateUser = async (id: string) => {
  const { data } = await api.post(`/admin/users/${id}/activate`);
  return data.data as { user: AdminUserListItem };
};

export const deactivateUser = async (id: string) => {
  const { data } = await api.post(`/admin/users/${id}/deactivate`);
  return data.data as { user: AdminUserListItem };
};

export const deleteUser = async (id: string) => {
  await api.delete(`/admin/users/${id}`);
};

export const resendPasswordSetup = async (id: string) => {
  await api.post(`/admin/users/${id}/resend-password-setup`);
};

export const resendVerificationEmail = async (id: string) => {
  await api.post(`/admin/users/${id}/resend-verification`);
};

export interface FacultyRequestItem {
  _id: string;
  user: { _id: string; name: string; email: string };
  department: string;
  designation: string;
  expertise?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const fetchFacultyRequests = async (status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<FacultyRequestItem[]> => {
  const { data } = await api.get('/auth/faculty/requests', { params: { status } });
  return (data.data.requests ?? []) as FacultyRequestItem[];
};

export const updateFacultyRequest = async (id: string, status: 'approved' | 'rejected'): Promise<FacultyRequestItem> => {
  const { data } = await api.patch(`/auth/faculty/requests/${id}`, { status });
  return data.data.request as FacultyRequestItem;
};

export type ActivityType =
  | 'registration'
  | 'login'
  | 'user-create'
  | 'user-update'
  | 'user-delete'
  | 'activate'
  | 'deactivate'
  | 'role-change'
  | 'faculty-approve'
  | 'faculty-reject'
  | 'password-reset-request'
  | 'email-verification';

export interface ActivityItem {
  _id: string;
  type: ActivityType;
  createdAt: string;
  user: { _id: string; name: string; email: string; role: string };
  actor?: { _id: string; name: string; email: string; role: string };
  message: string;
}

export const fetchActivities = async (params?: { type?: ActivityType; page?: number; limit?: number }) => {
  const { data } = await api.get('/admin/activities', { params });
  return data.data as { items: ActivityItem[]; total: number; page: number; limit: number };
};

export interface ReportSummary {
  students: number;
  faculty: number;
  admins: number;
  submissions: number;
}

export const fetchReportSummary = async (): Promise<ReportSummary> => {
  const { data } = await api.get('/admin/reports/summary');
  return data.data as ReportSummary;
};

export const downloadReport = async (format: 'pdf' | 'xlsx'): Promise<void> => {
  const url = format === 'pdf' ? '/admin/reports/summary.pdf' : '/admin/reports/summary.xlsx';
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], {
    type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `summary.${format}`;
  link.click();
  window.URL.revokeObjectURL(link.href);
};

export const downloadUsersExcel = async (): Promise<void> => {
  const response = await api.get('/admin/reports/users.xlsx', { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = 'users.xlsx';
  link.click();
  window.URL.revokeObjectURL(link.href);
};

// Reports: Admin evaluation stats by department
export interface DepartmentEvaluationStat {
  department: string;
  count: number;
  avgScore: number | null;
}

export const fetchEvaluationStatsByDepartment = async (): Promise<DepartmentEvaluationStat[]> => {
  const { data } = await api.get('/admin/reports/evaluations/stats');
  return (data.data?.items ?? []) as DepartmentEvaluationStat[];
};

export const downloadEvaluationStatsExcel = async (): Promise<void> => {
  const response = await api.get('/admin/reports/evaluations/stats.xlsx', { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = 'dept-evaluation-stats.xlsx';
  link.click();
  window.URL.revokeObjectURL(link.href);
};
