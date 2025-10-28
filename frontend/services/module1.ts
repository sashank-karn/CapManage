import api from './api';

export interface ModuleRequirement {
  _id: string;
  moduleName: string;
  initiative?: string | null;
  epic?: string | null;
  feature?: string | null;
  userStory?: string | null;
  acceptanceCriteria?: string | null;
  priority?: string | null;
  estimate?: string | number | null;
  reasoning?: string | null;
}

export const fetchModule1Requirements = async (): Promise<ModuleRequirement[]> => {
  const { data } = await api.get('/module1/requirements');
  return data.data.requirements as ModuleRequirement[];
};

export type FacultyRequestStatus = 'pending' | 'approved' | 'rejected';

export interface FacultyRequestSummary {
  _id: string;
  department: string;
  designation: string;
  expertise?: string;
  status: FacultyRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  user: {
    _id: string;
    name: string;
    email: string;
    metadata?: Record<string, unknown>;
  };
}

export const fetchFacultyQueue = async (status: FacultyRequestStatus = 'pending'): Promise<FacultyRequestSummary[]> => {
  const { data } = await api.get('/module1/faculty/queue', { params: { status } });
  return data.data.queue as FacultyRequestSummary[];
};

export const updateFacultyRequestStatus = async (
  id: string,
  status: Exclude<FacultyRequestStatus, 'pending'>
): Promise<FacultyRequestSummary> => {
  const { data } = await api.patch(`/auth/faculty/requests/${id}`, { status });
  return data.data.request as FacultyRequestSummary;
};
