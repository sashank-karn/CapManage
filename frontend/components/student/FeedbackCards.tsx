"use client";

import { useState } from "react";
import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

export const FeedbackCards = ({ data }: { data: StudentDashboardSnapshot }) => {
  const [items, setItems] = useState(data.feedback);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-slate-700">Faculty Feedback</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((f) => (
          <div key={f.id} className="rounded-md border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">{f.submission}</p>
            <p className="text-xs text-slate-500">by {f.faculty} • {new Date(f.timestamp).toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-700">{f.summary}</p>
            <div className="mt-3">
              <button
                className={`rounded-md border px-2 py-1 text-xs ${f.acknowledged ? 'border-emerald-600 text-emerald-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setItems((prev) => prev.map((x) => x.id === f.id ? { ...x, acknowledged: true } : x))}
                disabled={f.acknowledged}
              >
                {f.acknowledged ? 'Read' : 'Mark as Read'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
