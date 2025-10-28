export interface DeadlineItem {
  id: string;
  title: string;
  dueDate: string;
  course?: string;
}

export interface MilestoneSummary {
  id: string;
  title: string;
  status: 'completed' | 'pending' | 'in-progress';
  dueDate: string;
}

export interface ActivityItem {
  id: string;
  type: 'submission' | 'feedback' | 'update';
  description: string;
  timestamp: string;
}

export interface FeedbackItem {
  id: string;
  submission: string;
  faculty: string;
  summary: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface NotificationItem {
  id: string;
  category: 'deadline' | 'feedback' | 'activity';
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SubmissionStatusItem {
  id: string;
  title: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  lastUpdated: string;
}

export interface CollaborationMessage {
  id: string;
  sender: 'student' | 'faculty' | 'system';
  author: string;
  message: string;
  timestamp: string;
}

export interface StudentProjectSummary {
  id: string;
  name: string;
  progressPercent: number;
  faculty?: {
    name: string;
    email?: string;
  };
}

export interface StudentDashboardOverview {
  percentComplete: number;
  completedMilestones: number;
  inProgressMilestones: number;
  pendingMilestones: number;
  totalMilestones: number;
  unreadNotifications: number;
  pendingSubmissions: number;
  nextDeadline: DeadlineItem | null;
}

export interface StudentDashboardSnapshot {
  project: StudentProjectSummary | null;
  overview: StudentDashboardOverview;
  deadlines: DeadlineItem[];
  milestones: MilestoneSummary[];
  activities: ActivityItem[];
  feedback: FeedbackItem[];
  notifications: NotificationItem[];
  submissions: SubmissionStatusItem[];
  collaboration: CollaborationMessage[];
  generatedAt: string;
}

export const sampleStudentDashboard: StudentDashboardSnapshot = {
  project: {
    id: 'project-1',
    name: 'AI-Powered Capstone Assistant',
    progressPercent: 58,
    faculty: {
      name: 'Prof. Dsouza',
      email: 'dsouza@example.edu'
    }
  },
  overview: {
    percentComplete: 58,
    completedMilestones: 1,
    inProgressMilestones: 1,
    pendingMilestones: 2,
    totalMilestones: 4,
    unreadNotifications: 2,
    pendingSubmissions: 1,
    nextDeadline: {
      id: 'deadline-1',
      title: 'Synopsis Submission',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
      course: 'Capstone Planning'
    }
  },
  deadlines: [
    {
      id: 'deadline-1',
      title: 'Synopsis Submission',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
      course: 'Capstone Planning'
    },
    {
      id: 'deadline-2',
      title: 'Research Log Milestone',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      course: 'Research Methods'
    },
    {
      id: 'deadline-3',
      title: 'Prototype Demo',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(),
      course: 'Capstone Studio'
    }
  ],
  milestones: [
    {
      id: 'milestone-1',
      title: 'Project Proposal',
      status: 'completed',
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    },
    {
      id: 'milestone-2',
      title: 'Synopsis Submission',
      status: 'pending',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString()
    },
    {
      id: 'milestone-3',
      title: 'Midterm Evaluation',
      status: 'pending',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString()
    },
    {
      id: 'milestone-4',
      title: 'Final Defense',
      status: 'in-progress',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString()
    }
  ],
  activities: [
    {
      id: 'activity-1',
      type: 'submission',
      description: 'Uploaded project proposal PDF',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    {
      id: 'activity-2',
      type: 'feedback',
      description: 'Faculty feedback on proposal received',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString()
    },
    {
      id: 'activity-3',
      type: 'update',
      description: 'Team synced midterm rubric outline',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    }
  ],
  feedback: [
    {
      id: 'feedback-1',
      submission: 'Project Proposal',
      faculty: 'Dr. Mehta',
      summary: 'Clarify the research gap and include timeline specifics.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      acknowledged: false
    },
    {
      id: 'feedback-2',
      submission: 'Team Charter',
      faculty: 'Prof. Dsouza',
      summary: 'Add stakeholder contact information.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      acknowledged: true
    }
  ],
  notifications: [
    {
      id: 'notification-1',
      category: 'deadline',
      message: 'Synopsis submission is due tomorrow at 10:00 PM.',
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      read: false
    },
    {
      id: 'notification-2',
      category: 'feedback',
      message: 'New feedback posted on Project Proposal.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: false
    },
    {
      id: 'notification-3',
      category: 'activity',
      message: 'Midterm evaluation rubric has been updated.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      read: true
    }
  ],
  submissions: [
    {
      id: 'submission-1',
      title: 'Project Proposal',
      status: 'reviewed',
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    {
      id: 'submission-2',
      title: 'Synopsis Draft',
      status: 'pending',
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
    },
    {
      id: 'submission-3',
      title: 'Research Log',
      status: 'accepted',
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
    }
  ],
  collaboration: [
    {
      id: 'message-1',
      sender: 'faculty',
      author: 'Prof. Dsouza',
      message: 'Please attach the updated timeline before Friday.',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: 'message-2',
      sender: 'student',
      author: 'You',
      message: 'Will do, uploading a revised plan tonight.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: 'message-3',
      sender: 'system',
      author: 'Automated insight',
      message: 'Midterm rubric has been refreshed based on faculty guidance.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    }
  ],
  generatedAt: new Date().toISOString()
};
