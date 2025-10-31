"use client";

import { useEffect, useRef, useState } from 'react';
import { RoleGate } from '../../../components/RoleGate';
import { listFacultyProjects } from '../../../services/projects';
import { listMessages, sendMessageApi, type Message } from '../../../services/messages';
import { useAuth } from '../../../context/AuthContext';

let ioClient: any;

const FacultyMessagesPage = () => {
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<'group' | 'direct'>('group');
  const [directStudentId, setDirectStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const { initialized, user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const list = await listFacultyProjects();
        const mapped = list.map((p) => ({ _id: p._id, name: p.name }));
        setProjects(mapped);
        if (!projectId && mapped.length) {
          let preselect: string | null = null;
          if (typeof window !== 'undefined') {
            try {
              const sp = new URLSearchParams(window.location.search);
              preselect = sp.get('projectId');
            } catch {}
          }
          if (preselect && mapped.some((p) => p._id === preselect)) setProjectId(preselect);
          else setProjectId(mapped[0]._id);
        }
        const allStudents = list.flatMap((p) => p.students.map((s) => ({ id: s._id, name: s.name })));
        const unique = allStudents.reduce((acc: Array<{ id: string; name: string }>, curr) => acc.find(a => a.id === curr.id) ? acc : acc.concat(curr), []);
        setStudents(unique);
        if (!directStudentId && unique.length) setDirectStudentId(unique[0].id);
      } catch {}
    };
    void load();
  }, []);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      try {
        if (mode === 'group') {
          if (!projectId) { setMessages([]); return; }
          const list = await listMessages({ projectId, limit: 100 });
          if (!cancel) setMessages(list);
        } else {
          if (!directStudentId) { setMessages([]); return; }
          const list = await listMessages({ withUserId: directStudentId, limit: 100 });
          if (!cancel) setMessages(list);
        }
      } catch {}
    };
    void load();
    return () => { cancel = true; };
  }, [projectId, mode, directStudentId]);

  // socket client to refresh messages in real-time
  useEffect(() => {
    if (!initialized || !user) return;
    const ensureClient = async () => {
      if (!ioClient) {
        const { io } = await import('socket.io-client');
        ioClient = io(process.env.NEXT_PUBLIC_WS_BASE_URL || (process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1','') || 'http://localhost:5000'), {
          auth: { userId: user._id }
        });
      } else {
        ioClient.auth = { userId: user._id };
        ioClient.connect();
      }
      const onNew = () => {
        // Reload active conversation on new message for this user
        (async () => {
          try {
            if (mode === 'group') {
              if (!projectId) return;
              const list = await listMessages({ projectId, limit: 100 });
              setMessages(list);
            } else {
              if (!directStudentId) return;
              const list = await listMessages({ withUserId: directStudentId, limit: 100 });
              setMessages(list);
            }
          } catch {}
        })();
      };
      ioClient.on('message:new', onNew);
      return () => {
        try { ioClient?.off('message:new', onNew); } catch {}
      };
    };
    const disposerPromise = ensureClient();
    return () => { void disposerPromise.then((d: any) => { if (typeof d === 'function') d(); }); };
  }, [initialized, user, mode, projectId, directStudentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      const created = await (mode === 'group'
        ? (projectId ? sendMessageApi({ text, projectId }) : Promise.reject())
        : (directStudentId ? sendMessageApi({ text, recipientId: directStudentId }) : Promise.reject()));
      setMessages((prev) => [...prev, created]);
    } catch {}
  };

  return (
    <RoleGate roles={["faculty"]}>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-3 text-sm text-slate-700">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs">
              <button className={"px-2 py-1 " + (mode === 'group' ? 'bg-slate-100' : '')} onClick={() => setMode('group')}>Group</button>
              <button className={"px-2 py-1 " + (mode === 'direct' ? 'bg-slate-100' : '')} onClick={() => setMode('direct')}>Direct</button>
            </div>
            {mode === 'group' ? (
              <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
                {projects.length === 0 ? <option value="">No projects</option> : null}
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={directStudentId ?? ''} onChange={(e) => setDirectStudentId(e.target.value || null)}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex h-[520px] flex-col">
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {mode === 'group' ? (projectId ? (
                messages.map((m) => (
                  <div key={m._id} className={"flex " + (m.sender === 'faculty' ? 'justify-end' : 'justify-start')}>
                    <div className={"max-w-[70%] rounded-lg px-3 py-2 text-sm " + (m.sender === 'faculty' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800')}>
                      <p>{m.text}</p>
                      <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))) : (
                <p className="text-xs text-slate-500">No project selected.</p>
              )) : (
                directStudentId ? (
                  messages.map((m) => (
                    <div key={m._id} className={"flex " + (m.sender === 'faculty' ? 'justify-end' : 'justify-start')}>
                      <div className={"max-w-[70%] rounded-lg px-3 py-2 text-sm " + (m.sender === 'faculty' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800')}>
                        <p>{m.text}</p>
                        <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No student selected.</p>
                )
              )}
              <div ref={endRef} />
            </div>
            <div className="flex items-center gap-2 border-t border-slate-200 p-3">
              <input
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
                placeholder={projectId ? 'Type a message...' : 'Select a project to chat'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSend()}
                disabled={!projectId}
              />
              <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50" onClick={onSend} disabled={!projectId}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
};

export default FacultyMessagesPage;
