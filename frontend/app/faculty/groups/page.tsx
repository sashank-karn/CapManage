"use client";

import { useEffect, useState } from 'react';
import { RoleGate } from '../../../components/RoleGate';
import { createFacultyProject, listFacultyProjects, updateProjectMembers, type FacultyProject } from '../../../services/projects';
import { publishToast } from '../../../lib/toast';
import EmailChipsInput from '../../../components/EmailChipsInput';
import Link from 'next/link';

const FacultyGroupsPage = () => {
  const [projects, setProjects] = useState<FacultyProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [addEmailsMap, setAddEmailsMap] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    try {
      const list = await listFacultyProjects();
      setProjects(list);
    } catch (e) {
      publishToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const studentEmails = emails;
      const created = await createFacultyProject({ name: name.trim(), description: description.trim() || undefined, studentEmails });
      setProjects((prev) => [created, ...prev]);
      setName('');
      setDescription('');
      setEmails([]);
      publishToast('Project group created', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Failed to create project';
      publishToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const onAddEmails = async (projectId: string) => {
    const list = (addEmailsMap[projectId] || []).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    try {
      const updated = await updateProjectMembers(projectId, { addEmails: list });
      setProjects((prev) => prev.map((p) => (p._id === projectId ? updated : p)));
      setAddEmailsMap((m) => ({ ...m, [projectId]: [] }));
      publishToast('Members added', 'success');
    } catch (e) {
      publishToast('Failed to add members', 'error');
    }
  };

  return (
    <RoleGate roles={["faculty"]}>
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-800">Create project group</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="sm:col-span-2">
              <EmailChipsInput value={emails} onChange={setEmails} placeholder="Add student emails" />
              <p className="mt-1 text-[11px] text-slate-500">Press Enter, comma, or semicolon to add. Paste multiple addresses from a list.</p>
            </div>
            <div>
              <button disabled={saving} onClick={onCreate} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? 'Creating…' : 'Create group'}</button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-800">Your project groups</h2>
            <button onClick={() => void load()} className="text-sm text-indigo-600 hover:underline">Refresh</button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No groups yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200">
              {projects.map((p) => (
                <li key={p._id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      {p.description ? <p className="text-xs text-slate-500">{p.description}</p> : null}
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-600">
                        {p.students.length > 0 ? p.students.map((s) => (
                          <span key={s._id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">{s.email}</span>
                        )) : <span>—</span>}
                      </div>
                    </div>
                    <div className="shrink-0 space-x-2">
                      <Link href={`/faculty/messages?projectId=${p._id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Open chat</Link>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <EmailChipsInput value={addEmailsMap[p._id] || []} onChange={(v) => setAddEmailsMap((m) => ({ ...m, [p._id]: v }))} placeholder="Add member emails" />
                    <button onClick={() => onAddEmails(p._id)} className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700">Add</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </RoleGate>
  );
};

export default FacultyGroupsPage;
