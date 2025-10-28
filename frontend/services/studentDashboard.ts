import api from './api';
import type { StudentDashboardSnapshot } from '../lib/studentDashboard';

export const fetchStudentDashboard = async (): Promise<StudentDashboardSnapshot> => {
  const { data } = await api.get('/module2/dashboard-preview');
  return data.data as StudentDashboardSnapshot;
};
