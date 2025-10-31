"use client";

import { useEffect, useState } from 'react';
import { StudentHeader } from '../../components/student/StudentHeader';
import { ActivitiesFeed } from '../../components/student/ActivitiesFeed';
import { FeedbackCards } from '../../components/student/FeedbackCards';
import { sampleStudentDashboard, type StudentDashboardSnapshot } from '../../lib/studentDashboard';
import { fetchStudentDashboard } from '../../services/studentDashboard';
import { RoleGate } from '../../components/RoleGate';

const FeedbackPage = () => {
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
        <StudentHeader title="Feedback & Activities" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ActivitiesFeed data={data} />
          <FeedbackCards data={data} />
        </div>
      </div>
    </RoleGate>
  );
};

export default FeedbackPage;
