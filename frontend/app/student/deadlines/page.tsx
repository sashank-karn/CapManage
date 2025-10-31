"use client";

import { useEffect, useState } from 'react';
import { StudentHeader } from '../../../components/student/StudentHeader';
import { DeadlineList } from '../../../components/student/DeadlineList';
import { NotificationFeed } from '../../../components/student/NotificationFeed';
import { sampleStudentDashboard, type StudentDashboardSnapshot } from '../../../lib/studentDashboard';
import { fetchStudentDashboard } from '../../../services/studentDashboard';
import { RoleGate } from '../../../components/RoleGate';

const StudentDeadlinesPage = () => {
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
        <StudentHeader title="Deadlines & Notifications" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DeadlineList data={data} />
          <NotificationFeed />
        </div>
      </div>
    </RoleGate>
  );
};

export default StudentDeadlinesPage;
