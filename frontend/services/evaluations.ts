import api from './api';

export interface StudentEvaluationItem {
  id: string;
  project: string;
  milestoneType: string;
  status: 'submitted' | 'under-review' | 'approved' | 'revisions-requested';
  totalScore: number | null;
  revisionDueDate?: string | null;
  comments?: string;
}

export async function listMyEvaluations(projectId?: string): Promise<StudentEvaluationItem[]> {
  const { data } = await api.get('/student/evaluations', { params: projectId ? { projectId } : {} });
  return data.data as StudentEvaluationItem[];
}

export interface StudentEvaluationHistoryItem {
  id: string;
  by: string;
  byEmail?: string;
  rubricScores: Record<string, number>;
  totalScore: number | null;
  comments: string;
  status: StudentEvaluationItem['status'];
  createdAt: string;
  revisionDueDate?: string | null;
}

export async function listMyEvaluationHistory(submissionId: string): Promise<StudentEvaluationHistoryItem[]> {
  const { data } = await api.get(`/student/evaluations/${submissionId}/history`);
  return data.data as StudentEvaluationHistoryItem[];
}
