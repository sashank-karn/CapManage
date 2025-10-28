"use client";

import Link from 'next/link';
import clsx from 'classnames';
import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { publishToast } from '../../lib/toast';
import {
  sampleStudentDashboard,
  type StudentDashboardSnapshot,
  type NotificationItem,
  type SubmissionStatusItem,
  type CollaborationMessage,
  type DeadlineItem
} from '../../lib/studentDashboard';
import { fetchStudentDashboard } from '../../services/studentDashboard';

type PanelId =
  | 'overview'
  | 'deadlines'
  | 'progress'
  | 'activity'
  | 'feedback'
  | 'notifications'
  | 'submissions'
  | 'collaboration'
  | 'todo';

interface PanelDefinition {
  id: PanelId;
  label: string;
  description: string;
}

interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoPanelState {
  todos: TodoItem[];
  newTodo: string;
  onNewTodoChange: (value: string) => void;
  onAddTodo: () => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const PANEL_DEFINITIONS: PanelDefinition[] = [
  { id: 'overview', label: 'Overview', description: 'Snapshot & quick actions' },
  { id: 'deadlines', label: 'Deadlines', description: 'Upcoming submissions' },
  { id: 'progress', label: 'Progress', description: 'Milestones & completion' },
  { id: 'activity', label: 'Activity', description: 'Recent updates & events' },
  { id: 'feedback', label: 'Feedback', description: 'Mentor guidance' },
  { id: 'notifications', label: 'Notifications', description: 'Alerts & reminders' },
  { id: 'submissions', label: 'Submissions', description: 'Review status' },
  { id: 'collaboration', label: 'Collaboration', description: 'Conversation threads' },
  { id: 'todo', label: 'Action board', description: 'Personal task list' }
];

const TODO_STORAGE_KEY = 'capmanage.dashboard.todo';
const PANEL_STORAGE_KEY = 'capmanage.dashboard.panels';

const DEFAULT_PANEL_VISIBILITY: Record<PanelId, boolean> = {
  overview: true,
  deadlines: true,
  progress: true,
  activity: true,
  feedback: true,
  notifications: true,
  submissions: true,
  collaboration: true,
  todo: true
};

const STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-emerald-50 text-emerald-600 ring-emerald-500/30',
  reviewed: 'bg-indigo-50 text-indigo-600 ring-indigo-500/30',
  pending: 'bg-amber-50 text-amber-600 ring-amber-500/30',
  rejected: 'bg-rose-50 text-rose-600 ring-rose-500/30',
  default: 'bg-slate-100 text-slate-600 ring-slate-500/20'
};

const CATEGORY_STYLES: Record<NotificationItem['category'], string> = {
  deadline: 'bg-amber-500/10 text-amber-600',
  feedback: 'bg-indigo-500/10 text-indigo-600',
  activity: 'bg-slate-500/10 text-slate-600'
};

const DashboardPage = () => {
  const { user, initialized } = useRequireAuth({ redirectTo: '/login' });
  const [activePanel, setActivePanel] = useState<PanelId>('overview');
  const [panelVisibility, setPanelVisibility] = useState<Record<PanelId, boolean>>(DEFAULT_PANEL_VISIBILITY);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  const generateTodoId = useCallback(() => {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(TODO_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return;
      setTodos(
        parsed
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const id = 'id' in item ? String((item as { id: unknown }).id) : null;
            const title = 'title' in item ? String((item as { title: unknown }).title) : null;
            const completed = 'completed' in item ? Boolean((item as { completed: unknown }).completed) : false;
            if (!id || !title) return null;
            return { id, title, completed } as TodoItem;
          })
          .filter((value): value is TodoItem => Boolean(value))
      );
    } catch (loadError) {
      console.warn('Unable to restore dashboard to-do list', loadError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
    } catch (persistError) {
      console.warn('Unable to persist dashboard to-do list', persistError);
    }
  }, [todos]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(PANEL_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<Record<PanelId, boolean>>;
      setPanelVisibility((current) => {
        const next = { ...current };
        if (parsed && typeof parsed === 'object') {
          (Object.keys(parsed) as PanelId[]).forEach((key) => {
            if (typeof parsed[key] === 'boolean') {
              next[key] = parsed[key] as boolean;
            }
          });
        }
        return next;
      });
    } catch (loadError) {
      console.warn('Unable to restore dashboard widget preferences', loadError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelVisibility));
    } catch (persistError) {
      console.warn('Unable to persist dashboard widget preferences', persistError);
    }
  }, [panelVisibility]);

  const visiblePanels = useMemo(
    () => PANEL_DEFINITIONS.filter((panel) => panelVisibility[panel.id]),
    [panelVisibility]
  );

  useEffect(() => {
    if (panelVisibility[activePanel]) return;
    const fallback = visiblePanels[0]?.id ?? 'overview';
    setActivePanel(fallback);
  }, [panelVisibility, activePanel, visiblePanels]);

  const addTodo = useCallback(() => {
    const trimmed = newTodo.trim();
    if (!trimmed) return;
    setTodos((current) => [...current, { id: generateTodoId(), title: trimmed, completed: false }]);
    setNewTodo('');
  }, [newTodo, generateTodoId]);

  const toggleTodo = useCallback((id: string) => {
    setTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

  const togglePanelVisibility = useCallback(
    (panel: PanelId) => {
      setPanelVisibility((current) => {
        const visibleCount = Object.values(current).filter(Boolean).length;
        if (current[panel] && visibleCount === 1) {
          publishToast('At least one dashboard panel must remain visible.', 'info');
          return current;
        }
        return { ...current, [panel]: !current[panel] };
      });
    },
    []
  );

  const { data, error, isLoading } = useSWR<StudentDashboardSnapshot>(
    user?.role === 'student' ? 'student-dashboard' : null,
    () => fetchStudentDashboard(),
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (error) {
      publishToast('Unable to load dashboard insights. Showing latest saved snapshot.', 'error');
    }
  }, [error]);

  const usingFallback = Boolean(error && !data);

  const snapshot = useMemo<StudentDashboardSnapshot | null>(() => {
    if (data) return data;
    if (usingFallback) return sampleStudentDashboard;
    return null;
  }, [data, usingFallback]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    []
  );

  const quickFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
    []
  );

  const formatFullDate = (value: string) => dateFormatter.format(new Date(value));
  const formatQuickDate = (value: string) => quickFormatter.format(new Date(value));

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    if (!snapshot) return [];
    const { overview } = snapshot;
    const nextDeadlineLabel = overview.nextDeadline
      ? `${overview.nextDeadline.title} • ${timeRemaining(overview.nextDeadline.dueDate)}`
      : 'No upcoming items';
    const outstandingTodos = todos.filter((todo) => !todo.completed).length;

    return [
      {
        id: 'progress',
        label: 'Completion',
        value: `${overview.percentComplete}%`,
        hint: `${overview.completedMilestones}/${overview.totalMilestones} milestones complete`
      },
      {
        id: 'deadline',
        label: 'Next deadline',
        value: overview.nextDeadline ? formatQuickDate(overview.nextDeadline.dueDate) : 'Not scheduled',
        hint: nextDeadlineLabel
      },
      {
        id: 'alerts',
        label: 'Unread alerts',
        value: String(overview.unreadNotifications),
        hint: overview.unreadNotifications ? 'Review your notifications' : 'All caught up'
      },
      {
        id: 'reviews',
        label: 'Pending reviews',
        value: String(overview.pendingSubmissions),
        hint:
          overview.pendingSubmissions > 0
            ? 'Faculty review in progress'
            : 'All submissions updated'
      },
      {
        id: 'tasks',
        label: 'Open tasks',
        value: String(outstandingTodos),
        hint: outstandingTodos ? 'Update your action board' : 'You cleared every to-do'
      }
    ];
  }, [snapshot, formatQuickDate, todos]);

  if (!initialized) {
    return (
      <section className="mx-auto flex h-64 w-full max-w-4xl items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-lg">
        <p className="text-sm text-slate-500">Preparing your dashboard...</p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Header
          userName={user.name}
          role={user.role}
          project={snapshot?.project ?? null}
          summaryMetrics={user.role === 'student' ? summaryMetrics : []}
        />

        {user.role === 'student' ? (
          <section className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-4">
              <SidebarNav active={activePanel} onSelect={setActivePanel} panels={visiblePanels} />
              {usingFallback ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Showing demo data because the latest dashboard service is unavailable.
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-500">
                <p className="font-semibold text-slate-600">Last refreshed</p>
                <p>{snapshot ? formatFullDate(snapshot.generatedAt) : 'Waiting for data...'}</p>
              </div>
              <WidgetSettings visibility={panelVisibility} onToggle={togglePanelVisibility} />
            </aside>

            <section className="space-y-6">
              {(() => {
                if (activePanel === 'todo') {
                  return renderPanel({
                    panel: activePanel,
                    snapshot,
                    formatFullDate,
                    formatQuickDate,
                    todoState: {
                      todos,
                      newTodo,
                      onNewTodoChange: (value: string) => setNewTodo(value),
                      onAddTodo: addTodo,
                      onToggleTodo: toggleTodo,
                      onDeleteTodo: deleteTodo
                    }
                  });
                }

                if (isLoading && !snapshot) {
                  return <LoadingPanel />;
                }

                if (!snapshot) {
                  return (
                    <EmptyState
                      title="No dashboard data"
                      description="We could not find any Module 1 activity for your account yet. Start by reviewing the requirements and adding your first submission."
                      action={{ href: '/module1', label: 'Browse Module 1 stories' }}
                    />
                  );
                }

                return renderPanel({
                  panel: activePanel,
                  snapshot,
                  formatFullDate,
                  formatQuickDate,
                  todoState: {
                    todos,
                    newTodo,
                    onNewTodoChange: (value: string) => setNewTodo(value),
                    onAddTodo: addTodo,
                    onToggleTodo: toggleTodo,
                    onDeleteTodo: deleteTodo
                  }
                });
              })()}
            </section>
          </section>
        ) : user.role === 'faculty' ? (
          <RoleSummary
            title="Faculty workspace"
            description="Monitor your approval status, review Module 1 requirements, and get ready to mentor your upcoming cohort."
            actions={[
              { href: '/module1', label: 'Open Module 1 requirements' },
              { href: '/dashboard/profile', label: 'Update profile (coming soon)', disabled: true }
            ]}
          />
        ) : (
          <RoleSummary
            title="Administrator overview"
            description="Track onboarding activity, approve faculty promptly, and make sure Module 1 stays compliant."
            actions={[
              { href: '/module1', label: 'Review faculty queue' },
              { href: '/dashboard/profile', label: 'Manage account settings (coming soon)', disabled: true }
            ]}
          />
        )}
      </div>
    </main>
  );
};

export default DashboardPage;

const Header = ({
  userName,
  role,
  project,
  summaryMetrics
}: {
  userName: string;
  role: string;
  project: StudentDashboardSnapshot['project'] | null;
  summaryMetrics: SummaryMetric[];
}) => (
  <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 px-8 py-10 text-white shadow-xl">
    <div className="relative z-10 flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Dashboard</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">Welcome back, {userName.split(' ')[0]}!</h1>
      <p className="max-w-2xl text-sm text-white/80">
        {role === 'student'
          ? 'Everything you need to deliver Module 1 - deadlines, submissions, collaboration, and feedback - in one place.'
          : role === 'faculty'
            ? 'Monitor your onboarding journey, stay ahead of student progress, and prepare to guide your cohort.'
            : 'Oversee onboarding operations, approve faculty quickly, and keep Module 1 objectives on track.'}
      </p>

      {project ? (
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Current project</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="font-semibold text-white">{project.name}</span>
            {project.faculty?.name ? (
              <span className="text-white/80">Mentor: {project.faculty.name}</span>
            ) : null}
            <span className="text-white/80">Progress: {project.progressPercent}%</span>
          </div>
        </div>
      ) : null}

      {summaryMetrics.length ? (
        <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold leading-tight text-white">{metric.value}</p>
              {metric.hint ? <p className="mt-1 text-xs text-white/70">{metric.hint}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>

    <div className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
    <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
  </header>
);

const SidebarNav = ({
  active,
  onSelect,
  panels
}: {
  active: PanelId;
  onSelect: (panel: PanelId) => void;
  panels: PanelDefinition[];
}) => (
  <nav className="rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm">
    {panels.length ? (
      <ul className="space-y-1">
        {panels.map((panel) => {
          const isActive = panel.id === active;
          return (
            <li key={panel.id}>
              <button
                type="button"
                onClick={() => onSelect(panel.id)}
                className={clsx(
                  'w-full rounded-xl px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-200',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <p className="text-sm font-semibold">{panel.label}</p>
                <p className={clsx('text-xs', isActive ? 'text-white/80' : 'text-slate-500')}>{panel.description}</p>
              </button>
            </li>
          );
        })}
      </ul>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
        Select at least one widget in the customizer to display dashboard content.
      </div>
    )}
  </nav>
);

const WidgetSettings = ({
  visibility,
  onToggle
}: {
  visibility: Record<PanelId, boolean>;
  onToggle: (panel: PanelId) => void;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-xs text-slate-600 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customize widgets</p>
    <p className="mt-1 text-sm text-slate-600">Choose the panels that should appear in your workspace.</p>
    <ul className="mt-4 space-y-2">
      {PANEL_DEFINITIONS.map((panel) => (
        <li key={panel.id}>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
            <span>{panel.label}</span>
            <input
              type="checkbox"
              checked={Boolean(visibility[panel.id])}
              onChange={() => onToggle(panel.id)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-[11px] text-slate-400">Your preferences are stored in this browser, so the dashboard opens just how you left it.</p>
  </div>
);

const renderPanel = ({
  panel,
  snapshot,
  formatFullDate,
  formatQuickDate,
  todoState
}: {
  panel: PanelId;
  snapshot: StudentDashboardSnapshot | null;
  formatFullDate: (value: string) => string;
  formatQuickDate: (value: string) => string;
  todoState: TodoPanelState;
}) => {
  if (panel === 'todo') {
    return (
      <TodoPanel
        todos={todoState.todos}
        newTodo={todoState.newTodo}
        onNewTodoChange={todoState.onNewTodoChange}
        onAddTodo={todoState.onAddTodo}
        onToggleTodo={todoState.onToggleTodo}
        onDeleteTodo={todoState.onDeleteTodo}
      />
    );
  }

  if (!snapshot) {
    return (
      <EmptyState
        title="Dashboard data loading"
        description="We're still gathering your Module 1 insights. Try again in a moment."
      />
    );
  }

  switch (panel) {
    case 'overview':
      return <OverviewPanel snapshot={snapshot} formatFullDate={formatFullDate} formatQuickDate={formatQuickDate} />;
    case 'deadlines':
      return <DeadlinesPanel deadlines={snapshot.deadlines} formatFullDate={formatFullDate} />;
    case 'progress':
      return <ProgressPanel snapshot={snapshot} formatFullDate={formatFullDate} />;
    case 'activity':
      return <ActivityPanel activities={snapshot.activities} formatFullDate={formatFullDate} />;
    case 'feedback':
      return <FeedbackPanel feedback={snapshot.feedback} formatQuickDate={formatQuickDate} />;
    case 'notifications':
      return <NotificationsPanel notifications={snapshot.notifications} formatQuickDate={formatQuickDate} />;
    case 'submissions':
      return <SubmissionsPanel submissions={snapshot.submissions} formatQuickDate={formatQuickDate} />;
    case 'collaboration':
      return <CollaborationPanel messages={snapshot.collaboration} formatQuickDate={formatQuickDate} />;
    default:
      return null;
  }
};

const OverviewPanel = ({
  snapshot,
  formatFullDate,
  formatQuickDate
}: {
  snapshot: StudentDashboardSnapshot;
  formatFullDate: (value: string) => string;
  formatQuickDate: (value: string) => string;
}) => {
  const upcoming = snapshot.deadlines.slice(0, 3);
  const recentFeedback = snapshot.feedback.slice(0, 3);
  const recentActivity = snapshot.activities.slice(0, 5);

  return (
    <div className="space-y-6">
      <WidgetCard title="Key insights" subtitle="Stay focused on what matters this week">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InsightTile
            title="Overall progress"
            value={`${snapshot.overview.percentComplete}%`}
            detail={`${snapshot.overview.completedMilestones}/${snapshot.overview.totalMilestones} milestones complete`}
          />
          <InsightTile
            title="Next deadline"
            value={snapshot.overview.nextDeadline ? formatQuickDate(snapshot.overview.nextDeadline.dueDate) : 'Not scheduled'}
            detail={snapshot.overview.nextDeadline ? snapshot.overview.nextDeadline.title : 'Once scheduled you will see it here.'}
          />
          <InsightTile
            title="Unread alerts"
            value={String(snapshot.overview.unreadNotifications)}
            detail={snapshot.overview.unreadNotifications ? 'Check the notifications panel' : 'All alerts are cleared'}
          />
          <InsightTile
            title="Pending reviews"
            value={String(snapshot.overview.pendingSubmissions)}
            detail={snapshot.overview.pendingSubmissions ? 'Faculty will respond soon' : 'No submissions waiting'}
          />
        </div>
      </WidgetCard>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <WidgetCard title="Upcoming deadlines" subtitle="Keep your next deliverables on track" className="xl:col-span-2">
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{deadline.title}</p>
                    <p className="text-xs text-slate-500">{formatFullDate(deadline.dueDate)}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {deadline.course ? <p className="font-medium text-slate-400">{deadline.course}</p> : null}
                    <p className="font-semibold text-indigo-600">{timeRemaining(deadline.dueDate)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No upcoming deadlines"
              description="Once an instructor schedules your next deliverable, it will appear here."
            />
          )}
        </WidgetCard>

        <WidgetCard title="Latest feedback" subtitle="Act quickly on mentor guidance">
          {recentFeedback.length ? (
            <ul className="space-y-3 text-sm">
              {recentFeedback.map((item) => (
                <li key={item.id} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.submission}</p>
                      <p className="text-xs text-slate-500">{item.faculty}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatQuickDate(item.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No recent feedback"
              description="You will see detailed feedback from your mentor once reviews begin."
            />
          )}
        </WidgetCard>
      </div>

      <WidgetCard title="Recent activity" subtitle="Latest submissions, updates, and reminders">
        {recentActivity.length ? (
          <ol className="space-y-3 text-sm">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>{activity.type}</span>
                  <span>{formatFullDate(activity.timestamp)}</span>
                </div>
                <p className="mt-2 font-medium text-slate-900">{activity.description}</p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="No recorded activity"
            description="Submit your first deliverable or wait for faculty to share an update."
          />
        )}
      </WidgetCard>
    </div>
  );
};

const DeadlinesPanel = ({ deadlines, formatFullDate }: { deadlines: DeadlineItem[]; formatFullDate: (value: string) => string }) => (
  <WidgetCard title="Deadline schedule" subtitle="Align every submission with Module 1 timelines">
    {deadlines.length ? (
      <div className="flow-root">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-3">Milestone</th>
              <th className="py-3">When</th>
              <th className="py-3">Course</th>
              <th className="py-3 text-right">Countdown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deadlines.map((deadline) => (
              <tr key={deadline.id}>
                <td className="py-3 font-semibold text-slate-900">{deadline.title}</td>
                <td className="py-3 text-slate-600">{formatFullDate(deadline.dueDate)}</td>
                <td className="py-3 text-slate-500">{deadline.course ?? '-'}</td>
                <td className="py-3 text-right font-medium text-indigo-600">{timeRemaining(deadline.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState
        title="No deadlines scheduled"
        description="Once milestones are assigned, you'll see dates and countdowns in this view."
      />
    )}
  </WidgetCard>
);

const ProgressPanel = ({
  snapshot,
  formatFullDate
}: {
  snapshot: StudentDashboardSnapshot;
  formatFullDate: (value: string) => string;
}) => {
  const { overview } = snapshot;
  const completedPercent = overview.totalMilestones
    ? Math.round((overview.completedMilestones / overview.totalMilestones) * 100)
    : 0;
  const inProgressPercent = overview.totalMilestones
    ? Math.round((overview.inProgressMilestones / overview.totalMilestones) * 100)
    : 0;

  const chartStyle: CSSProperties = {
    background: `conic-gradient(#34d399 0 ${completedPercent}%, #38bdf8 ${completedPercent}% ${
      completedPercent + inProgressPercent
    }%, #e2e8f0 ${completedPercent + inProgressPercent}% 100%)`
  };

  return (
    <div className="space-y-6">
      <WidgetCard title="Milestone completion" subtitle="Track execution across Module 1 requirements">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full text-sm font-semibold text-slate-900" style={chartStyle}>
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-inner">
                <span>{overview.percentComplete}% complete</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">{overview.completedMilestones} of {overview.totalMilestones} milestones completed</p>
          </div>
          <ul className="flex-1 space-y-2 text-sm text-slate-600">
            <li className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2">
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Completed</span>
              <span className="font-semibold text-emerald-600">{overview.completedMilestones}</span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-sky-50 px-4 py-2">
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" />In progress</span>
              <span className="font-semibold text-sky-600">{overview.inProgressMilestones}</span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2">
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" />Pending</span>
              <span className="font-semibold text-slate-600">{overview.pendingMilestones}</span>
            </li>
          </ul>
        </div>
      </WidgetCard>

      <WidgetCard title="Milestone timeline" subtitle="Understand each deliverable's status">
        {snapshot.milestones.length ? (
          <ul className="space-y-3 text-sm">
            {snapshot.milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-900">{milestone.title}</p>
                  <p className="text-xs text-slate-500">{formatFullDate(milestone.dueDate)}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{milestone.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No milestones configured"
            description="Once your project milestones are created, they will appear in this list."
          />
        )}
      </WidgetCard>
    </div>
  );
};

const ActivityPanel = ({ activities, formatFullDate }: { activities: StudentDashboardSnapshot['activities']; formatFullDate: (value: string) => string }) => (
  <WidgetCard title="Activity timeline" subtitle="Recent submissions, updates, and faculty notices">
    {activities.length ? (
      <ol className="space-y-3 text-sm">
        {activities.map((activity) => (
          <li key={activity.id} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>{activity.type}</span>
              <span>{formatFullDate(activity.timestamp)}</span>
            </div>
            <p className="mt-2 font-medium text-slate-900">{activity.description}</p>
          </li>
        ))}
      </ol>
    ) : (
      <EmptyState
        title="No recorded activity"
        description="As you submit work or receive updates, they will populate this feed."
      />
    )}
  </WidgetCard>
);

const FeedbackPanel = ({ feedback, formatQuickDate }: { feedback: StudentDashboardSnapshot['feedback']; formatQuickDate: (value: string) => string }) => (
  <WidgetCard title="Faculty feedback" subtitle="Turn review notes into action">
    {feedback.length ? (
      <ul className="space-y-3 text-sm">
        {feedback.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{item.submission}</p>
                <p className="text-xs text-slate-500">{item.faculty}</p>
              </div>
              <span className="text-xs text-slate-400">{formatQuickDate(item.timestamp)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {item.acknowledged ? 'Acknowledged' : 'Awaiting response'}
            </p>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState
        title="No faculty feedback yet"
        description="After your mentor reviews a submission, their notes will appear here."
      />
    )}
  </WidgetCard>
);

const NotificationsPanel = ({ notifications, formatQuickDate }: { notifications: NotificationItem[]; formatQuickDate: (value: string) => string }) => (
  <WidgetCard title="Notifications" subtitle="Reminders, alerts, and schedule nudges">
    {notifications.length ? (
      <ul className="space-y-3 text-sm">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={clsx(
              'rounded-2xl border px-4 py-3 shadow-sm transition',
              notification.read
                ? 'border-slate-200/80 bg-white text-slate-600'
                : 'border-indigo-200/80 bg-indigo-50 text-indigo-700'
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium', CATEGORY_STYLES[notification.category])}>
                {notification.category}
              </span>
              <span className="text-slate-400">{formatQuickDate(notification.createdAt)}</span>
            </div>
            <p className="mt-2 font-medium">{notification.message}</p>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState
        title="No notifications"
        description="We'll notify you when deadlines shift, submissions change status, or feedback arrives."
      />
    )}
  </WidgetCard>
);

const SubmissionsPanel = ({ submissions, formatQuickDate }: { submissions: SubmissionStatusItem[]; formatQuickDate: (value: string) => string }) => (
  <WidgetCard title="Submission status" subtitle="Keep track of every deliverable">
    {submissions.length ? (
      <div className="flow-root">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-3">Deliverable</th>
              <th className="py-3">Status</th>
              <th className="py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td className="py-3 font-semibold text-slate-900">{submission.title}</td>
                <td className="py-3">
                  <StatusBadge status={submission.status} />
                </td>
                <td className="py-3 text-slate-600">{formatQuickDate(submission.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState
        title="No submissions yet"
        description="Upload your first deliverable to begin the review process."
        action={{ href: '/module1', label: 'Review submission checklist' }}
      />
    )}
  </WidgetCard>
);

const CollaborationPanel = ({ messages, formatQuickDate }: { messages: CollaborationMessage[]; formatQuickDate: (value: string) => string }) => (
  <WidgetCard title="Collaboration" subtitle="Stay aligned with faculty and teammates">
    {messages.length ? (
      <ul className="space-y-3 text-sm">
        {messages.map((message) => (
          <li key={message.id} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-600">{message.author}</span>
              <span>{formatQuickDate(message.timestamp)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{message.message}</p>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState
        title="No collaboration messages"
        description="As faculty share comments or teammates add updates, you'll see them in this thread."
      />
    )}
  </WidgetCard>
);

const TodoPanel = ({
  todos,
  newTodo,
  onNewTodoChange,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo
}: TodoPanelState) => (
  <WidgetCard title="Action board" subtitle="Organize personal tasks alongside Module 1 expectations">
    <div className="space-y-4 text-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAddTodo();
        }}
        className="flex gap-2"
      >
        <input
          value={newTodo}
          onChange={(event) => onNewTodoChange(event.target.value)}
          placeholder="Add a follow-up or reminder"
          className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Add
        </button>
      </form>

      {todos.length ? (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
            >
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggleTodo(todo.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={todo.completed ? 'line-through text-slate-400' : ''}>{todo.title}</span>
              </label>
              <button
                type="button"
                onClick={() => onDeleteTodo(todo.id)}
                className="text-xs font-medium text-rose-500 transition hover:text-rose-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Capture what you need to do next - follow up with faculty, polish a submission, or schedule a study sprint.
        </p>
      )}
    </div>
  </WidgetCard>
);

const LoadingPanel = () => (
  <div className="space-y-4">
    <div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />
    <div className="h-40 animate-pulse rounded-3xl bg-slate-200/60" />
    <div className="h-40 animate-pulse rounded-3xl bg-slate-200/50" />
  </div>
);

const WidgetCard = ({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) => (
  <article
    className={clsx(
      'group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg',
      className
    )}
  >
    <div className="relative z-10 flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {children}
    </div>
    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
  </article>
);

const InsightTile = ({ title, value, detail }: { title: string; value: string; detail: string }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500">{detail}</p>
  </div>
);

const StatusBadge = ({ status }: { status: SubmissionStatusItem['status'] }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
      STATUS_STYLES[status] ?? STATUS_STYLES.default
    )}
  >
    {status}
  </span>
);

const EmptyState = ({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
    <p className="text-base font-semibold text-slate-700">{title}</p>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
    {action ? (
      <Link
        href={action.href}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        {action.label}
      </Link>
    ) : null}
  </div>
);

const RoleSummary = ({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions: Array<{ href: string; label: string; disabled?: boolean }>;
}) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/95 p-8 shadow-sm">
    <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
    <p className="mt-2 max-w-xl text-sm text-slate-600">{description}</p>
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      {actions.map((action) => (
        action.disabled ? (
          <span
            key={action.href}
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 font-medium text-slate-400"
          >
            {action.label}
          </span>
        ) : (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-full bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            {action.label}
          </Link>
        )
      ))}
    </div>
  </section>
);

const timeRemaining = (value: string): string => {
  const diffMs = new Date(value).getTime() - Date.now();
  if (diffMs <= 0) return 'Due today';
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h left`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? '1 day left' : `${diffDays} days left`;
};
