"use client";

import { BookOpen, CalendarDays, CheckCircle2, Mail } from "lucide-react";
import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

export const SummaryCards = ({ data }: { data: StudentDashboardSnapshot }) => {
  const items = [
    {
      label: "Total Projects",
      value: data.project ? 1 : 0,
      icon: BookOpen,
    },
    {
      label: "Completed Milestones",
      value: data.overview.completedMilestones,
      icon: CheckCircle2,
    },
    {
      label: "Upcoming Deadlines",
      value: data.deadlines.length,
      icon: CalendarDays,
    },
    {
      label: "Unread Feedback",
      value: data.feedback.filter((f) => !f.acknowledged).length,
      icon: Mail,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3 text-indigo-700">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
