"use client";

import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { listStudentProjects } from '../../../services/projects';
import { listMyEvaluations, listMyEvaluationHistory, type StudentEvaluationItem, type StudentEvaluationHistoryItem } from '../../../services/evaluations';

export default function StudentEvaluationsPage() {
  const { initialized } = useRequireAuth({ redirectTo: '/login', silent: true });
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [items, setItems] = useState<StudentEvaluationItem[]>([]);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [history, setHistory] = useState<StudentEvaluationHistoryItem[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      const list = await listStudentProjects();
      setProjects(list.map((p) => ({ _id: p._id, name: p.name })));
      if (!projectId && list.length) setProjectId(list[0]._id);
    };
    void loadProjects();
  }, []);

  useEffect(() => {
    const load = async () => {
      const res = await listMyEvaluations(projectId || undefined);
      setItems(res);
    };
    if (projectId) void load();
  }, [projectId]);

  useEffect(() => {
    if (!openHistory) return;
    let cancelled = false;
    const load = async () => {
      setLoadingHistory(true);
      try {
        const res = await listMyEvaluationHistory(openHistory);
        if (!cancelled) setHistory(res);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [openHistory]);

  if (!initialized) return null;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">My evaluations</h1>
        <p className="text-sm text-slate-600">See grades, comments, and revision deadlines.</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
            {projects.length === 0 ? <option value="">No projects</option> : null}
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Milestone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Comments</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No evaluations yet</td></tr>
            ) : items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 capitalize">{it.milestoneType.replace('-', ' ')}</td>
                <td className="px-4 py-3">{it.status}</td>
                <td className="px-4 py-3">{it.totalScore ?? '-'}</td>
                <td className="px-4 py-3 text-slate-700 max-w-sm truncate" title={it.comments || ''}>{it.comments || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setOpenHistory(it.id)} className="rounded border border-slate-200 px-3 py-1 text-xs">History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openHistory && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Evaluation history</h3>
              <button onClick={() => { setOpenHistory(null); setHistory(null); }} className="rounded-md border border-slate-200 px-2 py-1 text-xs">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {loadingHistory ? (
                <div className="p-6 text-center text-sm text-slate-500">Loading history…</div>
              ) : !history || history.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No history yet</div>
              ) : (
                <ul className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>By {h.by}{h.byEmail ? ` • ${h.byEmail}` : ''}</span>
                        <span>{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {Object.entries(h.rubricScores || {}).map(([k, v]) => (
                          <div key={k} className="rounded border border-slate-200 p-2 text-sm"><span className="text-slate-500">{k}:</span> <span className="font-medium">{v}</span></div>
                        ))}
                      </div>
                      <div className="mt-2 text-sm"><span className="text-slate-500">Total:</span> <span className="font-semibold">{h.totalScore ?? '-'}</span></div>
                      {h.revisionDueDate && (
                        <div className="mt-1 text-xs text-slate-500">Revision due {new Date(h.revisionDueDate).toLocaleDateString()}</div>
                      )}
                      {h.comments && <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">{h.comments}</div>}
                      <div className="mt-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{h.status}</span></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
