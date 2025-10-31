import api from './api';

export type FacultyProject = {
  _id: string;
  name: string;
  description?: string;
  students: Array<{ _id: string; name: string; email: string }>;
  faculty?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
};

export const listFacultyProjects = async (): Promise<FacultyProject[]> => {
  const { data } = await api.get('/projects/faculty/projects');
  return data.data as FacultyProject[];
};

export const createFacultyProject = async (payload: { name: string; description?: string; studentEmails?: string[]; studentIds?: string[] }): Promise<FacultyProject> => {
  const { data } = await api.post('/projects/faculty/projects', payload);
  return data.data as FacultyProject;
};

export const updateProjectMembers = async (
  id: string,
  payload: { add?: string[]; addEmails?: string[]; remove?: string[] }
): Promise<FacultyProject> => {
  const { data } = await api.patch(`/projects/faculty/projects/${id}/members`, payload);
  return data.data as FacultyProject;
};

export type StudentProject = {
  _id: string;
  name: string;
  description?: string;
  faculty?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
};

export const listStudentProjects = async (): Promise<StudentProject[]> => {
  const { data } = await api.get('/projects/student/projects');
  return data.data as StudentProject[];
};
