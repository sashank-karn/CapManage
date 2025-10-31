"use client";

import type { StudentDashboardSnapshot } from "../../lib/studentDashboard";

export const ProjectProgress = ({ data }: { data: StudentDashboardSnapshot }) => {
	const percent = data.overview.percentComplete;
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-slate-700">Project Progress</p>
					<p className="text-xs text-slate-500">{data.project?.name ?? 'No active project'}</p>
				</div>
				<p className="text-sm font-semibold text-slate-900">{percent}%</p>
			</div>
			<div className="mt-3 h-3 w-full rounded-full bg-slate-100">
				<div
					className="h-3 rounded-full bg-indigo-600 transition-all"
					style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
				/>
			</div>
			<div className="mt-2 flex justify-between text-xs text-slate-600">
				<span>{data.overview.completedMilestones} completed</span>
				<span>{data.overview.pendingMilestones} pending</span>
			</div>
		</div>
	);
};

export default ProjectProgress;
