"use client";

import { useEffect, useState } from 'react';
import { listStudentProjects } from '../../../services/projects';
import { uploadSubmission, listVersions, completeMilestone } from '../../../services/submissions';
import { publishToast } from '../../../lib/toast';
import { useRequireAuth } from '../../../hooks/useRequireAuth';

export default function StudentSubmissionsPage() {
  const { user, initialized } = useRequireAuth({ redirectTo: '/login', silent: true });
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string>('synopsis');
  const [file, setFile] = useState<File | null>(null);
  const [versions, setVersions] = useState<Array<{ versionNumber: number; createdAt: string; checksum?: string; submissionId?: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!initialized || !user) return;
    const load = async () => {
      try {
        const list = await listStudentProjects();
        setProjects(list.map((p) => ({ _id: p._id, name: p.name })));
        if (!projectId && list.length) setProjectId(list[0]._id);
      } catch {
        publishToast('Failed to load your projects', 'error');
      }
    };
    void load();
  }, [initialized, user]);

  useEffect(() => {
    const loadV = async () => {
      if (!projectId) { setVersions([]); return; }
      try {
        const list = await listVersions(projectId, milestone);
        setVersions(list);
      } catch {}
    };
    void loadV();
  }, [projectId, milestone]);

  const onUpload = async () => {
    if (!projectId || !file) return;
    setBusy(true);
    try {
  setProgress(0);
  const res = await uploadSubmission({ projectId, milestoneType: milestone, file }, (pct) => setProgress(pct));
      publishToast(`Uploaded v${res.version}`, 'success');
      const list = await listVersions(projectId, milestone);
      setVersions(list);
      setFile(null);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Upload failed';
      publishToast(`${msg}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const onMarkComplete = async () => {
    if (!projectId) return;
    try {
      await completeMilestone(projectId, milestone);
      publishToast('Milestone marked completed', 'success');
    } catch {
      publishToast('Failed to update milestone', 'error');
    }
  };

  if (!initialized) return null;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Submit project files</h1>
        <p className="text-sm text-slate-600">Allowed: PDF, DOC, DOCX, ZIP, MP4 up to 50MB</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
            {projects.length === 0 ? <option value="">No projects</option> : null}
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={milestone} onChange={(e) => setMilestone(e.target.value)}>
            <option value="synopsis">Synopsis</option>
            <option value="midterm">Midterm</option>
            <option value="final">Final</option>
            <option value="custom">Custom</option>
          </select>
          <input className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div>
            <button disabled={!file || !projectId || busy} onClick={onUpload} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{busy ? `Uploading… ${progress}%` : 'Upload'}</button>
            <button onClick={onMarkComplete} className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Mark milestone completed</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Version history</h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {versions.map((v) => (
            <li key={v.versionNumber} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-3">
                <span>v{v.versionNumber}</span>
              </div>
              <div className="flex items-center gap-3">
                {v.submissionId ? (
                  <>
                    <a className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/student/submissions/${v.submissionId}/versions/${v.versionNumber}/preview`}>Preview</a>
                    <a className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/student/submissions/${v.submissionId}/versions/${v.versionNumber}/download`}>Download</a>
                  </>
                ) : null}
                <span className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            </li>
          ))}
          {versions.length === 0 ? <p className="text-xs text-slate-500">No versions yet</p> : null}
        </ul>
      </div>
    </section>
  );
}
