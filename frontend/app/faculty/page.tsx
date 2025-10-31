"use client";

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { fetchSubmissions, postEvaluation, RUBRIC_TEMPLATES, fetchEvaluationHistory, fetchSubmissionVersions, fetchNotifications, markNotificationRead, getNotificationPrefs, fetchFacultyProjects, muteProjectNotifications, unmuteProjectNotifications, type EvaluationHistoryItem, type FacultySubmissionItem, type Milestone } from '../../services/faculty';
import type { VersionInfo } from '../../services/submissions';
import clsx from 'classnames';
import { publishToast } from '../../lib/toast';

type Tab = Milestone | 'all';

const FacultyPage = () => {
  const { initialized, authorized } = useRequireAuth({ roles: ['faculty'], redirectTo: '/login', silent: true });

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error, mutate } = useSWR(['faculty-submissions', tab, search, page], ([, t, q, p]) =>
    fetchSubmissions({ milestone: t === 'all' ? undefined : (t as Milestone), search: q as string, page: p as number, limit })
  );

  const items = data?.items || [];

  // Notifications + preferences
  const { data: notifications, mutate: mutateNotifications } = useSWR('faculty-notifications', fetchNotifications);
  const { data: prefs, mutate: mutatePrefs } = useSWR('faculty-prefs', getNotificationPrefs);
  const { data: projects } = useSWR('faculty-projects', fetchFacultyProjects);

  if (!initialized) return <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />;
  if (!authorized) return null;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Faculty Dashboard</h1>
        <p className="text-sm text-slate-600">Evaluate student submissions using rubrics and written feedback.</p>
      </header>

      {/* Tabs for milestones */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(['all','synopsis','mid-term','final'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={clsx('rounded-full px-3 py-1 text-xs font-medium', tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
              {t === 'all' ? 'All' : t.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
            </button>
          ))}
        </div>
        <input
          placeholder="Search by student name/email"
          className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

  {/* Submissions table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Milestone</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-red-600">Failed to load submissions</td></tr>
            ) : items.length ? (
              items.map((s) => <SubmissionRow key={s.id} item={s} onUpdated={mutate} />)
            ) : (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No submissions</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">Page {data.page} of {Math.ceil(data.total / data.limit)}</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-50">Previous</button>
            <button disabled={page >= Math.ceil(data.total / limit)} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Side panels: Notifications and Preferences */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Notifications</h2>
          {!notifications ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="text-sm text-slate-500">No notifications</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.slice(0, 10).map((n) => (
                <li key={n._id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{n.title}</div>
                    <div className="text-xs text-slate-600">{n.message}</div>
                    <div className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.sentAt ? (
                    <button onClick={async () => { await markNotificationRead(n._id); await mutateNotifications(); }} className="rounded border border-slate-200 px-2 py-1 text-xs">Mark read</button>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Read</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Notification preferences</h2>
          {!prefs || !projects ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-slate-500">No supervised projects</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.map((p) => {
                const muted = prefs.mutedProjects?.includes(p._id);
                return (
                  <li key={p._id} className="flex items-center justify-between py-2">
                    <div className="text-sm text-slate-800">{p.name}</div>
                    <button
                      onClick={async () => {
                        if (muted) {
                          await unmuteProjectNotifications(p._id);
                        } else {
                          await muteProjectNotifications(p._id);
                        }
                        await mutatePrefs();
                      }}
                      className={clsx('rounded px-3 py-1 text-xs font-medium', muted ? 'border border-slate-200 text-slate-700' : 'bg-slate-900 text-white')}
                    >
                      {muted ? 'Unmute' : 'Mute'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default FacultyPage;

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';

const SubmissionRow = ({ item, onUpdated }: { item: FacultySubmissionItem; onUpdated: () => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{item.student}</div>
        <div className="text-xs text-slate-500">{item.studentEmail}</div>
      </td>
      <td className="px-4 py-3">{item.project}</td>
      <td className="px-4 py-3 capitalize">{item.milestoneType.replace('-', ' ')}</td>
      <td className="px-4 py-3">
        {item.latestVersion?.versionNumber ? (
          <a
            href={`${apiBase}/student/submissions/${item.id}/versions/${item.latestVersion.versionNumber}/download`}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline"
          >
            Download v{item.latestVersion.versionNumber}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">{item.totalScore ?? '-'}</td>
      <td className="px-4 py-3">
        <span className={clsx('rounded-full px-2 py-1 text-xs font-medium',
          item.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
          : item.status === 'revisions-requested' ? 'bg-amber-100 text-amber-700'
          : item.status === 'under-review' ? 'bg-indigo-100 text-indigo-700'
          : 'bg-slate-100 text-slate-700'
        )}>{item.status}</span>
        {item.status === 'revisions-requested' && item.revisionDueDate && (
          <div className="mt-1 text-xs text-slate-500">Due {new Date(item.revisionDueDate).toLocaleDateString()}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => setOpen(true)} className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500">Evaluate</button>
        {open && <EvaluateDialog item={item} onClose={() => setOpen(false)} onUpdated={onUpdated} />}
      </td>
    </tr>
  );
};

const EvaluateDialog = ({ item, onClose, onUpdated }: { item: FacultySubmissionItem; onClose: () => void; onUpdated: () => void }) => {
  const [template, setTemplate] = useState<'classic'>('classic');
  const [scores, setScores] = useState<Record<string, number>>({ clarity: 0, originality: 0, presentation: 0 });
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState<FacultySubmissionItem['status']>('under-review');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'evaluate' | 'history'>('evaluate');
  const [history, setHistory] = useState<EvaluationHistoryItem[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [revisionDue, setRevisionDue] = useState<string>('');
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const rubric = RUBRIC_TEMPLATES[template];
  const total = rubric.reduce((acc, r) => acc + (scores[r.key] || 0), 0);

  useEffect(() => {
    // Initialize from existing totalScore if available (cannot reverse-engineer rubric breakdown, so start zeros)
  }, [item.id]);

  useEffect(() => {
    if (view !== 'history') return;
    let cancelled = false;
    const load = async () => {
      setLoadingHistory(true);
      try {
        const data = await fetchEvaluationHistory(item.id);
        if (!cancelled) setHistory(data);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
  void load();
    return () => { cancelled = true; };
  }, [view, item.id]);

  useEffect(() => {
    let cancelled = false;
    const loadVersions = async () => {
      setLoadingVersions(true);
      try {
        const data = await fetchSubmissionVersions(item.id);
        if (!cancelled) setVersions(data);
      } catch {
        if (!cancelled) setVersions([]);
      } finally {
        if (!cancelled) setLoadingVersions(false);
      }
    };
    void loadVersions();
    return () => { cancelled = true; };
  }, [item.id]);

  const setScore = (key: string, value: number) => {
    const max = rubric.find((r) => r.key === key)?.max ?? 10;
    setScores((s) => ({ ...s, [key]: Math.max(0, Math.min(max, value)) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await postEvaluation(item.id, { rubricScores: scores, comments: comments.trim() || undefined, status, revisionDueDate: status === 'revisions-requested' && revisionDue ? revisionDue : undefined });
      publishToast('Evaluation saved', 'success');
      onClose();
      onUpdated();
    } catch (e) {
      publishToast('Failed to save evaluation', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Evaluate • {item.student} • {item.milestoneType}</h3>
          <div className="ml-auto flex items-center gap-3">
            {item.latestVersion?.versionNumber && (
              <a href={`${apiBase}/student/submissions/${item.id}/versions/${item.latestVersion.versionNumber}/download`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                Download latest (v{item.latestVersion.versionNumber})
              </a>
            )}
            <button onClick={onClose} className="rounded-md border border-slate-200 px-2 py-1 text-xs">Close</button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 pt-3">
          {(['evaluate','history'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={clsx('rounded-full px-3 py-1 text-xs font-medium', view === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
              {v === 'evaluate' ? 'Evaluate' : 'History'}
            </button>
          ))}
        </div>
        {view === 'evaluate' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">Rubric template</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value as any)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm">
              <option value="classic">Clarity · Originality · Presentation</option>
            </select>
            <div className="space-y-2">
              {rubric.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-2">
                  <div className="text-sm text-slate-700">{r.label} <span className="text-xs text-slate-400">/ {r.max}</span></div>
                  <input type="number" min={0} max={r.max} value={scores[r.key] || 0} onChange={(e) => setScore(r.key, Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
            <div className="rounded-md border border-slate-200 p-2 text-sm">
              <div className="text-slate-600">Total score</div>
              <div className="text-xl font-semibold text-slate-900">{total}</div>
            </div>
            </div>
            <div className="space-y-3">
            <div className="rounded-md border border-slate-200 p-2">
              <div className="mb-2 text-xs font-medium text-slate-700">Versions</div>
              {loadingVersions ? (
                <div className="text-xs text-slate-500">Loading versions…</div>
              ) : !versions || versions.length === 0 ? (
                <div className="text-xs text-slate-500">No versions yet</div>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto pr-1 text-xs">
                  {versions.map((v) => (
                    <li key={v.versionNumber} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                      <div>
                        <span className="font-medium">v{v.versionNumber}</span>
                        <span className="ml-2 text-slate-500">{new Date(v.createdAt).toLocaleString()}</span>
                      </div>
                      <a className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" href={`${apiBase}/student/submissions/${item.id}/versions/${v.versionNumber}/download`}>Download</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="block text-xs font-medium text-slate-700">Written feedback</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={8} className="h-[220px] w-full resize-none rounded border border-slate-300 p-2 text-sm" placeholder="Comments for the student (visible only to them)" />
            <label className="block text-xs font-medium text-slate-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm">
              <option value="under-review">Under review</option>
              <option value="approved">Approved</option>
              <option value="revisions-requested">Revisions requested</option>
            </select>
            {status === 'revisions-requested' && (
              <div className="mt-2 space-y-1">
                <label className="block text-xs font-medium text-slate-700">Revision due date</label>
                <input type="date" value={revisionDue} onChange={(e) => setRevisionDue(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" />
                <p className="text-xs text-slate-500">Students will see this deadline in their notification.</p>
              </div>
            )}
            </div>
          </div>
        ) : (
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
        )}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
          <button onClick={onClose} className="rounded border border-slate-200 px-3 py-1 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? 'Saving…' : 'Save evaluation'}</button>
        </div>
      </div>
    </div>
  );
};
