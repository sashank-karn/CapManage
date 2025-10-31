"use client";

import { useEffect, useState } from 'react';
import { StudentHeader } from '../../components/student/StudentHeader';
import { ProjectProgress } from '../../components/student/ProjectProgress';
import { MilestoneChart } from '../../components/student/MilestoneChart';
import { SubmissionTable } from '../../components/student/SubmissionTable';
import { sampleStudentDashboard, type StudentDashboardSnapshot } from '../../lib/studentDashboard';
import { fetchStudentDashboard } from '../../services/studentDashboard';
import { RoleGate } from '../../components/RoleGate';

const ProgressPage = () => {
  const [data, setData] = useState<StudentDashboardSnapshot>(sampleStudentDashboard);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const snap = await fetchStudentDashboard();
        if (mounted) setData(snap);
      } catch {}
    };
    void load();
  }, []);

  return (
    <RoleGate roles={["student"]}>
      <div className="space-y-4">
        <StudentHeader title="Submissions & Progress" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProjectProgress data={data} />
            <div className="mt-4">
              <SubmissionTable data={data} />
            </div>
          </div>
          <div>
            <MilestoneChart data={data} />
          </div>
        </div>
      </div>
    </RoleGate>
  );
};

export default ProgressPage;
