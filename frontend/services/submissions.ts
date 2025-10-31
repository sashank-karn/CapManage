import api from './api';

export type UploadResult = { id: string; version: number };
export type VersionInfo = { versionNumber: number; createdAt: string; checksum?: string; submissionId?: string };

export async function uploadSubmission(form: { projectId: string; milestoneType: string; file: File }, onProgress?: (pct: number) => void): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('projectId', form.projectId);
  fd.append('milestoneType', form.milestoneType);
  fd.append('file', form.file);
  const { data } = await api.post('/student/submissions/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (!onProgress) return;
      if (typeof e.total === 'number' && e.total > 0) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    }
  });
  return data.data as UploadResult;
}

export async function listVersions(projectId: string, milestoneType: string, studentId?: string): Promise<VersionInfo[]> {
  const params: any = { projectId, milestoneType }; if (studentId) params.studentId = studentId;
  const { data } = await api.get('/student/submissions/versions', { params });
  return data.data as VersionInfo[];
}

export async function completeMilestone(projectId: string, milestoneType: string, notes?: string): Promise<void> {
  await api.post('/student/projects/milestones/complete', { projectId, milestoneType, notes });
}
