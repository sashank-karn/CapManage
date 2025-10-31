"use client";

import dayjs from "dayjs";
import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

export const DeadlineList = ({ data }: { data: StudentDashboardSnapshot }) => {
  const now = dayjs();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-slate-700">Upcoming Deadlines</p>
      <ul className="space-y-2">
        {data.deadlines.map((d) => {
          const due = dayjs(d.dueDate);
          const hours = due.diff(now, 'hour');
          const urgent = hours <= 24;
          const color = urgent ? 'text-rose-600 bg-rose-50' : 'text-amber-700 bg-amber-50';
          return (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{d.title}</p>
                <p className="text-xs text-slate-500">{d.course ?? 'Capstone'} • Due {due.format('MMM D, h:mm A')}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
                {urgent ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
