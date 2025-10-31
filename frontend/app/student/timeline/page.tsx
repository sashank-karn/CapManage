"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getSubmissionTimeline, type TimelineEvent } from "../../../services/studentDashboard";
import api from "../../../services/api";

const fetcher = async () => getSubmissionTimeline();

function groupByDate(events: TimelineEvent[]) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString();
  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const d = fmt(e.at);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export default function StudentTimelinePage() {
  const { data, error, isLoading } = useSWR("student-timeline", fetcher, { refreshInterval: 5 * 60_000 });
  const [downloading, setDownloading] = useState(false);

  const grouped = useMemo(() => (data ? groupByDate(data) : []), [data]);

  const downloadCsv = async () => {
    try {
      setDownloading(true);
      const res = await api.get("/student/reports/submissions/timeline.csv", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "submission-timeline.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const downloadExcel = async () => {
    const res = await api.get('/student/reports/submissions/timeline.xlsx', { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'submission-timeline.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPdf = async () => {
    const res = await api.get('/student/reports/submissions/timeline.pdf', { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'submission-timeline.pdf';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading) return <div className="p-6">Loading timeline…</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load timeline.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submission History</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            disabled={downloading}
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          >
            {downloading ? 'Preparing…' : 'Download CSV'}
          </button>
          <button onClick={downloadExcel} className="px-3 py-2 rounded border border-slate-300">Download Excel</button>
          <button onClick={downloadPdf} className="px-3 py-2 rounded border border-slate-300">Download PDF</button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="text-gray-500">No events yet.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="text-sm font-medium text-gray-600 mb-2">{date}</div>
              <ul className="space-y-2">
                {items
                  .sort((a, b) => a.at.localeCompare(b.at))
                  .map((e, idx) => (
                    <li key={idx} className="border rounded p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">{new Date(e.at).toLocaleTimeString()}</div>
                        <div className="font-medium">
                          {e.type === "due" && <span className="text-amber-600">Milestone Due</span>}
                          {e.type === "submitted" && <span className="text-blue-700">Submitted</span>}
                          {e.type === "evaluated" && <span className="text-green-700">Evaluated</span>}
                          <span className="ml-2">• {e.project} — {e.milestone}</span>
                        </div>
                        {e.meta && (
                          <div className="text-xs text-gray-600 mt-1">
                            {Object.entries(e.meta)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' | ')}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
