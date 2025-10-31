"use client";

import React from 'react';
import useSWR from 'swr';
import { fetchEvaluationStatsByDepartment, downloadEvaluationStatsExcel, type DepartmentEvaluationStat } from '../../../services/admin';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

export default function AdminDeptStatsPage() {
  const { initialized, user } = useAuth();
  const { data: rows, mutate } = useSWR<DepartmentEvaluationStat[]>(initialized && user?.role === 'admin' ? 'admin-dept-stats' : null, fetchEvaluationStatsByDepartment, { refreshInterval: 5 * 60 * 1000 });

  if (!initialized) return null;

  const total = (rows || []).reduce((acc, r) => acc + r.count, 0);
  const max = Math.max(1, ...(rows || []).map((r) => r.count));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Department Evaluation Stats</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => mutate()} className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Refresh</button>
            <button onClick={() => downloadEvaluationStatsExcel()} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Download Excel</button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
          <p className="mt-1 text-sm text-slate-700">Total evaluations: {total}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-medium text-slate-700">By Department (bar)</h3>
              <div className="mt-2 space-y-2">
                {(rows || []).map((r) => (
                  <div key={r.department}>
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span>{r.department}</span>
                      <span>{r.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                      <div className="h-2 bg-indigo-500" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {!rows?.length && <p className="text-xs text-slate-600">No data</p>}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-700">Average Score</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {(rows || []).map((r) => (
                  <li key={r.department} className="flex items-center justify-between py-2">
                    <span className="text-slate-800">{r.department}</span>
                    <span className="text-slate-700">{r.avgScore ?? '-'}</span>
                  </li>
                ))}
                {!rows?.length && <p className="text-xs text-slate-600">No data</p>}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Schedule this report</h2>
          <AdminScheduleForm />
        </section>
      </div>
    </main>
  );
}

function AdminScheduleForm() {
  const [emails, setEmails] = React.useState('');
  const [frequency, setFrequency] = React.useState<'daily'|'weekly'|'monthly'>('weekly');
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    setSaving(true);
    const recipients = emails.split(',').map(e => e.trim()).filter(Boolean);
    await api.post('/admin/reports/schedules', { type: 'admin-dept-stats', frequency, recipients });
    setSaving(false);
    setEmails('');
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
