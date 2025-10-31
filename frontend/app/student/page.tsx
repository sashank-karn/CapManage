"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '../../context/AuthContext';
import { fetchStudentDashboard, getTodos, createTodo, updateTodo, deleteTodo, getMessages, sendMessage, getNotifications, markNotificationRead, getDashboardPrefs, saveDashboardPrefs } from '../../services/studentDashboard';
import type { StudentDashboardSnapshot } from '../../lib/studentDashboard';
import clsx from 'classnames';

let ioClient: any;

const StudentDashboardPage = () => {
  const { initialized, user } = useAuth();
  const { data: snapshot, mutate: mutateSnapshot } = useSWR<StudentDashboardSnapshot>(initialized ? 'student-dashboard' : null, fetchStudentDashboard, { refreshInterval: 60000 });
  const { data: todos, mutate: mutateTodos } = useSWR(initialized ? 'todos' : null, getTodos);
  const { data: notifications, mutate: mutateNotifications } = useSWR(initialized ? 'notifications' : null, getNotifications);
  const { data: messages, mutate: mutateMessages } = useSWR(initialized ? 'messages' : null, getMessages, { refreshInterval: 0 });
  const { data: prefs, mutate: mutatePrefs } = useSWR(initialized ? 'prefs' : null, getDashboardPrefs);
  const [editingPrefs, setEditingPrefs] = useState(false);

  // socket client for messages
  useEffect(() => {
    if (!initialized || !user) return;
    if (!ioClient) {
      import('socket.io-client').then(({ io }) => {
        ioClient = io(process.env.NEXT_PUBLIC_WS_BASE_URL || (process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1','') || 'http://localhost:5000'), {
          auth: { userId: user._id }
        });
        ioClient.on('message:new', () => {
          mutateMessages();
        });
      });
    } else {
      ioClient.auth = { userId: user._id };
      ioClient.connect();
    }
    return () => { try { ioClient?.off('message:new'); } catch {} };
  }, [initialized, user, mutateMessages]);

  if (!initialized) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Student Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-600">Track deadlines, progress, submissions, and messages.</p>
            <button onClick={() => setEditingPrefs((v) => !v)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Customize</button>
          </div>
        </header>

        {editingPrefs && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Show/Hide Widgets</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {['deadlines','activities','submissions','feedback','notifications','todos','messages','chart'].map((id) => {
                const hidden = prefs?.hidden?.includes(id);
                return (
                  <label key={id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={!hidden} onChange={async () => {
                      const newHidden = hidden ? (prefs!.hidden.filter((x:any)=>x!==id)) : ([...(prefs?.hidden||[]), id]);
                      await saveDashboardPrefs({ order: prefs?.order || [], hidden: newHidden });
                      mutatePrefs();
                    }} />
                    <span className="capitalize">{id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Top: Progress + Next deadline */}
        {snapshot && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${snapshot.overview.percentComplete}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">{snapshot.overview.completedMilestones} completed · {snapshot.overview.pendingMilestones} pending · {snapshot.overview.inProgressMilestones} in-progress</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Next deadline</h2>
              {snapshot.overview.nextDeadline ? (
                <div className="mt-2">
                  <p className="text-slate-800">{snapshot.overview.nextDeadline.title}</p>
                  <p className="text-xs text-slate-600">Due {new Date(snapshot.overview.nextDeadline.dueDate).toLocaleString()}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-600">No upcoming deadlines</p>
              )}
            </div>
          </section>
        )}

        {snapshot && (
          <section>
            <MilestoneChart completed={snapshot.overview.completedMilestones} inProgress={snapshot.overview.inProgressMilestones} pending={snapshot.overview.pendingMilestones} />
          </section>
        )}

        {/* Middle: Deadlines, Activities, Submissions */}
        {!(prefs?.hidden||[]).includes('deadlines') || !(prefs?.hidden||[]).includes('activities') || !(prefs?.hidden||[]).includes('submissions') ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card title="Upcoming Deadlines">
            <ul className="divide-y divide-slate-100">
              {(snapshot?.deadlines || []).map((d) => (
                <li key={d.id} className="py-2">
                  <p className="text-sm text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-600">{new Date(d.dueDate).toLocaleString()}</p>
                </li>
              ))}
              {!snapshot?.deadlines?.length && <p className="text-xs text-slate-600">No deadlines</p>}
            </ul>
          </Card>

          <Card title="Recent Activities">
            <ul className="divide-y divide-slate-100">
              {(snapshot?.activities || []).map((a) => (
                <li key={a.id} className="py-2">
                  <p className="text-sm text-slate-900">{a.description}</p>
                  <p className="text-xs text-slate-600">{new Date(a.timestamp).toLocaleString()}</p>
                </li>
              ))}
              {!snapshot?.activities?.length && <p className="text-xs text-slate-600">No recent activity</p>}
            </ul>
          </Card>

          <Card title="Submission Status">
            <ul className="divide-y divide-slate-100">
              {(snapshot?.submissions || []).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <p className="text-sm text-slate-900">{s.title}</p>
                  <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold',
                    s.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                    s.status === 'reviewed' ? 'bg-indigo-100 text-indigo-700' :
                    s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  )}>{s.status}</span>
                </li>
              ))}
              {!snapshot?.submissions?.length && <p className="text-xs text-slate-600">No submissions yet</p>}
            </ul>
          </Card>
        </section>
        ) : null}

        {/* Row: Feedback + Notifications */}
        {!(prefs?.hidden||[]).includes('feedback') || !(prefs?.hidden||[]).includes('notifications') ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Faculty Feedback">
            <ul className="divide-y divide-slate-100">
              {(snapshot?.feedback || []).map((f) => (
                <li key={f.id} className="py-2">
                  <p className="text-sm font-medium text-slate-900">{f.submission} · <span className="font-normal text-slate-600">{f.faculty}</span></p>
                  <p className="text-sm text-slate-700">{f.summary}</p>
                  <p className="text-xs text-slate-500">{new Date(f.timestamp).toLocaleString()}</p>
                </li>
              ))}
              {!snapshot?.feedback?.length && <p className="text-xs text-slate-600">No recent feedback</p>}
            </ul>
          </Card>

          <Card title="Notifications">
            <ul className="divide-y divide-slate-100">
              {(notifications || []).map((n: any) => (
                <li key={n._id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-slate-900">{n.title || n.message}</p>
                    <p className="text-xs text-slate-600">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.sentAt && (
                    <button onClick={async () => { await markNotificationRead(n._id); mutateNotifications(); }} className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300">Mark read</button>
                  )}
                </li>
              ))}
              {!notifications?.length && <p className="text-xs text-slate-600">No notifications</p>}
            </ul>
          </Card>
        </section>
        ) : null}

        {/* Row: To-do + Messages */}
        {!(prefs?.hidden||[]).includes('todos') || !(prefs?.hidden||[]).includes('messages') ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {!(prefs?.hidden||[]).includes('todos') && <TodoCard todos={todos || []} onChange={() => { mutateTodos(); }} />}
          {!(prefs?.hidden||[]).includes('messages') && <MessagesCard messages={messages || []} onSend={async (text) => { await sendMessage(text); mutateMessages(); }} />}
        </section>
        ) : null}
      </div>
    </main>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
    <div className="mt-3">{children}</div>
  </div>
);

const TodoCard = ({ todos, onChange }: { todos: Array<{ _id: string; title: string; completed: boolean; dueDate?: string }>; onChange: () => void }) => {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const add = async () => {
    if (!title.trim()) return;
    await createTodo(title.trim(), due || undefined);
    setTitle(''); setDue(''); onChange();
  };
  return (
    <Card title="To-Do List">
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" className="w-full rounded border border-slate-200 px-3 py-2 text-sm" />
        <input value={due} onChange={(e) => setDue(e.target.value)} type="datetime-local" className="rounded border border-slate-200 px-3 py-2 text-sm" />
        <button onClick={add} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Add</button>
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {todos.map((t) => (
          <li key={t._id} className="flex items-center justify-between py-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={t.completed} onChange={async () => { await updateTodo(t._id, { completed: !t.completed }); onChange(); }} />
              <span className={clsx('text-sm', t.completed && 'line-through text-slate-500')}>{t.title}</span>
            </label>
            <div className="flex items-center gap-2">
              {t.dueDate && <span className="text-xs text-slate-500">{new Date(t.dueDate).toLocaleString()}</span>}
              <button onClick={async () => { await deleteTodo(t._id); onChange(); }} className="rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500">Delete</button>
            </div>
          </li>
        ))}
        {!todos.length && <p className="text-xs text-slate-600">No tasks yet</p>}
      </ul>
    </Card>
  );
};

const MessagesCard = ({ messages, onSend }: { messages: Array<{ _id: string; sender: string; text: string; createdAt: string }>; onSend: (text: string) => Promise<void> }) => {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [messages?.length]);
  const send = async () => { if (!text.trim()) return; await onSend(text.trim()); setText(''); };
  return (
    <Card title="Collaboration Messages">
      <div ref={listRef} className="h-64 overflow-y-auto rounded border border-slate-200 p-3">
        {(messages || []).map((m) => (
          <div key={m._id} className="mb-2">
            <p className="text-sm text-slate-900">{m.text}</p>
            <p className="text-[11px] text-slate-500">{new Date(m.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {!messages?.length && <p className="text-xs text-slate-600">No messages yet</p>}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="w-full rounded border border-slate-200 px-3 py-2 text-sm" />
        <button onClick={send} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Send</button>
      </div>
    </Card>
  );
};

export default StudentDashboardPage;

const MilestoneChart = ({ completed, inProgress, pending }: { completed: number; inProgress: number; pending: number }) => {
  const [view, setView] = useState<'bar' | 'pie'>('bar');
  const total = Math.max(1, completed + inProgress + pending);
  const frac = {
    completed: completed / total,
    inProgress: inProgress / total,
    pending: pending / total
  };
  const circumference = 2 * Math.PI * 40;
  const offsets = {
    completed: 0,
    inProgress: circumference * frac.completed,
    pending: circumference * (frac.completed + frac.inProgress)
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Milestone Completion</h2>
        <div className="inline-flex overflow-hidden rounded-full border border-slate-200 text-xs">
          <button onClick={() => setView('bar')} className={clsx('px-2 py-1', view === 'bar' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700')}>Bar</button>
          <button onClick={() => setView('pie')} className={clsx('px-2 py-1', view === 'pie' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700')}>Pie</button>
        </div>
      </div>
      {view === 'bar' ? (
        <div className="mt-3 h-4 w-full overflow-hidden rounded bg-slate-100">
          <div className="h-4 bg-emerald-500" style={{ width: `${frac.completed * 100}%` }} />
          <div className="-mt-4 h-4 bg-indigo-500" style={{ width: `${(frac.completed + frac.inProgress) * 100}%` }} />
          <div className="-mt-4 h-4 bg-amber-500" style={{ width: `${(frac.completed + frac.inProgress + frac.pending) * 100}%` }} />
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-6">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="10" fill="none" />
            <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference - circumference * frac.completed} />
            <circle cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference - circumference * (frac.completed + frac.inProgress)} />
            <circle cx="50" cy="50" r="40" stroke="#f59e0b" strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference - circumference * (frac.completed + frac.inProgress + frac.pending)} />
          </svg>
          <div className="text-xs text-slate-600">
            <div className="mb-1"><span className="inline-block h-2 w-2 rounded bg-emerald-500"></span> Completed: {completed}</div>
            <div className="mb-1"><span className="inline-block h-2 w-2 rounded bg-indigo-500"></span> In progress: {inProgress}</div>
            <div><span className="inline-block h-2 w-2 rounded bg-amber-500"></span> Pending: {pending}</div>
          </div>
        </div>
      )}
    </div>
  );
};
