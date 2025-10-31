"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

export const MilestoneChart = ({ data }: { data: StudentDashboardSnapshot }) => {
  const [mode, setMode] = useState<"bar" | "pie">("bar");
  const chartData = useMemo(() => {
    const completed = data.milestones.filter((m) => m.status === 'completed').length;
    const inprogress = data.milestones.filter((m) => m.status === 'in-progress').length;
    const pending = data.milestones.filter((m) => m.status === 'pending').length;
    return [
      { name: 'Completed', value: completed, color: '#16a34a' },
      { name: 'In Progress', value: inprogress, color: '#2563eb' },
      { name: 'Pending', value: pending, color: '#f59e0b' }
    ];
  }, [data]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Milestone Completion</p>
        <div className="flex items-center gap-2 text-xs">
          <button
            className={"rounded-md border px-2 py-1 " + (mode === 'bar' ? 'border-indigo-600 text-indigo-700' : 'border-slate-200 text-slate-600')}
            onClick={() => setMode('bar')}
          >
            Bar
          </button>
          <button
            className={"rounded-md border px-2 py-1 " + (mode === 'pie' ? 'border-indigo-600 text-indigo-700' : 'border-slate-200 text-slate-600')}
            onClick={() => setMode('pie')}
          >
            Pie
          </button>
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value">
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
