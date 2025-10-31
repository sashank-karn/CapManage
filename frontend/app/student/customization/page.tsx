"use client";

import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../hooks/useRequireAuth';

type Prefs = { order: string[]; hidden: string[] };
const ALL_WIDGETS = [
  { id: 'summary', label: 'Summary Cards' },
  { id: 'progress', label: 'Project Progress' },
  { id: 'chart', label: 'Milestone Chart' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'activities', label: 'Activities' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'messages', label: 'Messages' },
  { id: 'todo', label: 'To-Do' }
];

const StudentCustomizationPage = () => {
  const [prefs, setPrefs] = useState<Prefs>({ order: ALL_WIDGETS.map((w) => w.id), hidden: [] });

  useEffect(() => {
    const raw = localStorage.getItem('dashboard.prefs');
    if (raw) setPrefs(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard.prefs', JSON.stringify(prefs));
  }, [prefs]);

  const move = (from: number, to: number) => {
    setPrefs((prev) => {
      const order = [...prev.order];
      const [item] = order.splice(from, 1);
      order.splice(to, 0, item);
      return { ...prev, order };
    });
  };

  const toggle = (id: string) => {
    setPrefs((prev) => {
      const hidden = new Set(prev.hidden);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...prev, hidden: Array.from(hidden) };
    });
  };

  const { initialized, authorized } = useRequireAuth({ roles: ["student"] });

  if (!initialized || !authorized) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard Customization</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-slate-700">Arrange and toggle widgets</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {prefs.order.map((id, idx) => {
            const labels = ALL_WIDGETS.find((w) => w.id === id)!;
            const hidden = prefs.hidden.includes(id);
            return (
              <div key={id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{labels.label}</p>
                  <p className="text-xs text-slate-500">{hidden ? 'Hidden' : 'Visible'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => toggle(id)}>{hidden ? 'Show' : 'Hide'}</button>
                  <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => idx > 0 && move(idx, idx - 1)} disabled={idx === 0}>Up</button>
                  <button className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => idx < prefs.order.length - 1 && move(idx, idx + 1)} disabled={idx === prefs.order.length - 1}>Down</button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">Your preferences are saved to your browser. We can also sync to your account if the API is available.</p>
      </div>
    </div>
  );
};

export default StudentCustomizationPage;
