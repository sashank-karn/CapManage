"use client";

import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

const badgeClass = (s: string) =>
  s === 'pending'
    ? 'bg-amber-50 text-amber-700'
    : s === 'accepted'
    ? 'bg-emerald-50 text-emerald-700'
    : s === 'rejected'
    ? 'bg-rose-50 text-rose-700'
    : 'bg-sky-50 text-sky-700';

export const SubmissionTable = ({ data }: { data: StudentDashboardSnapshot }) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed">
        <thead className="bg-slate-50 text-left text-sm">
          <tr>
            <th className="px-4 py-2 font-medium text-slate-600">Milestone</th>
            <th className="px-4 py-2 font-medium text-slate-600">Status</th>
            <th className="px-4 py-2 font-medium text-slate-600">Last Updated</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.submissions.map((s) => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className="px-4 py-2 text-slate-800">{s.title}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(s.status)}`}>
                  {s.status}
                </span>
              </td>
              <td className="px-4 py-2 text-slate-600">{new Date(s.lastUpdated).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
