"use client";

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetchProgressReport, downloadProgressExcel, type FacultyProgressRow } from '../../../services/faculty';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import clsx from 'classnames';

export default function FacultyEvaluationOverviewPage() {
  const { initialized, user } = useAuth();
  const { data: rows, mutate } = useSWR<FacultyProgressRow[]>(initialized && user?.role === 'faculty' ? 'faculty-progress' : null, fetchProgressReport, { refreshInterval: 5 * 60 * 1000 });

  const [q, setQ] = useState('');
  const [minPercent, setMinPercent] = useState(0);
  const [hideComplete, setHideComplete] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const txt = `${r.studentName} ${r.studentEmail} ${r.projectName}`.toLowerCase();
      if (needle && !txt.includes(needle)) return false;
      if (r.completionPercent < minPercent) return false;
      if (hideComplete && r.completionPercent === 100) return false;
      return true;
    });
  }, [rows, q, minPercent, hideComplete]);

  if (!initialized) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Evaluation Overview</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadProgressExcel()} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Download Excel</button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name/project" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">Min %</label>
              <input type="number" min={0} max={100} value={minPercent} onChange={(e) => setMinPercent(Number(e.target.value) || 0)} className="w-24 rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={hideComplete} onChange={(e) => setHideComplete(e.target.checked)} /> Hide 100%</label>
            <button onClick={() => mutate()} className="justify-self-start rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Refresh</button>
          </div>
        </section>

        {/* Mini chart: distribution buckets */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Completion Distribution</h2>
          <CompletionDistribution rows={filtered} />
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Weekly Trends (last 8 weeks)</h3>
            <WeeklyTrends />
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">Schedule this report</h3>
            <ScheduleForm type="faculty-progress" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Students</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Completed</th>
                  <th className="px-3 py-2">Percent</th>
                  <th className="px-3 py-2">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={`${r.projectId}-${r.studentId}`}>
                    <td className="px-3 py-2 text-slate-900">{r.studentName}</td>
                    <td className="px-3 py-2 text-slate-700">{r.studentEmail}</td>
                    <td className="px-3 py-2 text-slate-700">{r.projectName}</td>
                    <td className="px-3 py-2 text-slate-700">{r.completedMilestones}/{r.totalMilestones}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-40 overflow-hidden rounded bg-slate-100">
                          <div className={clsx('h-2', r.completionPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: `${r.completionPercent}%` }} />
                        </div>
                        <span className="text-slate-700">{r.completionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', r.lateCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>{r.lateCount}</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-600">No matching records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function CompletionDistribution({ rows }: { rows: FacultyProgressRow[] }) {
  const buckets = [0, 20, 40, 60, 80, 100];
  const counts = buckets.map((b, i) => rows.filter((r) => {
    const next = buckets[i + 1] ?? 100;
    if (i === buckets.length - 1) return r.completionPercent === 100;
    return r.completionPercent >= b && r.completionPercent < next;
  }).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="mt-3 flex items-end gap-3">
      {counts.map((c, i) => (
        <div key={i} className="text-center">
          <div className="mx-auto w-8 rounded bg-indigo-500" style={{ height: `${Math.round((c / max) * 80) + 20}px` }} />
          <div className="mt-1 text-[11px] text-slate-600">{buckets[i]}{i < buckets.length - 1 ? '-' + (buckets[i+1]-1) : ''}%</div>
          <div className="text-[11px] text-slate-900">{c}</div>
        </div>
      ))}
    </div>
  );
}

function WeeklyTrends() {
  const { data } = useSWR('faculty-trends', async () => {
    const res = await api.get('/faculty/reports/trends');
    return (res.data.data?.series ?? []) as Array<{ label: string; count: number; avgScore: number | null }>;
  }, { refreshInterval: 5 * 60 * 1000 });
  const series = data || [];
  const maxCount = Math.max(1, ...series.map(s => s.count));
  return (
    <div className="mt-2 grid gap-3 md:grid-cols-2">
      <div>
        <div className="text-xs text-slate-700">Evaluations per week</div>
        <div className="mt-2 space-y-2">
          {series.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between text-[11px] text-slate-600"><span>{s.label}</span><span>{s.count}</span></div>
              <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                <div className="h-2 bg-indigo-500" style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }} />
              </div>
            </div>
          ))}
          {!series.length && <div className="text-xs text-slate-600">No data</div>}
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-700">Average score</div>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {series.map((s) => (
            <li key={s.label} className="flex items-center justify-between py-1">
              <span className="text-slate-800">{s.label}</span>
              <span className="text-slate-700">{s.avgScore ?? '-'}</span>
            </li>
          ))}
          {!series.length && <div className="text-xs text-slate-600">No data</div>}
        </ul>
      </div>
    </div>
  );
}

function ScheduleForm({ type }: { type: 'faculty-progress' }) {
  const [emails, setEmails] = useState('');
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'>('weekly');
  const [saving, setSaving] = useState(false);
  const { mutate } = useSWR('faculty-schedules', async () => {
    const res = await api.get('/faculty/reports/schedules');
    return res.data.data?.items ?? [];
  });
  const submit = async () => {
    setSaving(true);
    const recipients = emails.split(',').map(e => e.trim()).filter(Boolean);
    await api.post('/faculty/reports/schedules', { type, frequency, recipients });
    setSaving(false);
    setEmails('');
    mutate?.();
  };
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <label className="text-xs text-slate-600">Recipients (comma-separated)</label>
        <input value={emails} onChange={e=>setEmails(e.target.value)} placeholder="someone@example.com, other@example.com" className="rounded border border-slate-300 px-3 py-2 text-sm w-96" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-600">Frequency</label>
        <select value={frequency} onChange={e=>setFrequency(e.target.value as any)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button onClick={submit} disabled={saving} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{saving? 'Saving…' : 'Schedule'}</button>
    </div>
  );
}
