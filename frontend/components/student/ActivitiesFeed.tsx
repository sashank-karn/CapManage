"use client";

import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

export const ActivitiesFeed = ({ data }: { data: StudentDashboardSnapshot }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-slate-700">Recent Activities</p>
      <ul className="space-y-2">
        {data.activities.map((a) => (
          <li key={a.id} className="rounded-md border border-slate-200 p-3">
            <p className="text-sm font-medium capitalize text-slate-800">{a.type}</p>
            <p className="text-xs text-slate-600">{a.description}</p>
            <p className="mt-1 text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
