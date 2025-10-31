"use client";

import { useEffect, useRef, useState } from "react";
import { listStudentProjects } from "../../services/projects";
import { listMessages, sendMessageApi } from "../../services/messages";
import { useAuth } from "../../context/AuthContext";

type Msg = { _id: string; sender: string; text: string; createdAt: string };

let ioClient: any;

export const ChatPanel = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [projects, setProjects] = useState<Array<{ _id: string; name: string; facultyId?: string; facultyName?: string }>>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [mode, setMode] = useState<'group' | 'direct'>('group');
  const [directFacultyId, setDirectFacultyId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const { initialized, user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await listStudentProjects();
        const mapped = list.map((p) => ({ _id: p._id, name: p.name, facultyId: (p.faculty as any)?._id, facultyName: (p.faculty as any)?.name }));
        if (mounted) {
          setProjects(mapped);
          if (!projectId && mapped.length) setProjectId(mapped[0]._id);
          if (!directFacultyId) {
            const firstFac = mapped.find((m) => m.facultyId)?.facultyId || null;
            setDirectFacultyId(firstFac);
          }
        }
      } catch {}
    };
    void load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        if (mode === 'group') {
          if (!projectId) { setMessages([]); return; }
          const list = await listMessages({ projectId, limit: 100 });
          if (!cancelled) setMessages(list);
        } else {
          if (!directFacultyId) { setMessages([]); return; }
          const list = await listMessages({ withUserId: directFacultyId, limit: 100 });
          if (!cancelled) setMessages(list);
        }
      } catch {}
    };
    void fetchMessages();
    return () => { cancelled = true; };
  }, [projectId, directFacultyId, mode]);

  // socket client for live chat updates
  useEffect(() => {
    if (!initialized || !user) return;
    const setup = async () => {
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
        (async () => {
          try {
            if (mode === 'group') {
              if (!projectId) return;
              const list = await listMessages({ projectId, limit: 100 });
              setMessages(list);
            } else {
              if (!directFacultyId) return;
              const list = await listMessages({ withUserId: directFacultyId, limit: 100 });
              setMessages(list);
            }
          } catch {}
        })();
      };
      ioClient.on('message:new', onNew);
      return () => { try { ioClient?.off('message:new', onNew); } catch {} };
    };
    const disposerPromise = setup();
    return () => { void disposerPromise.then((d: any) => { if (typeof d === 'function') d(); }); };
  }, [initialized, user, mode, projectId, directFacultyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      const created = await (mode === 'group'
        ? (projectId ? sendMessageApi({ text, projectId }) : Promise.reject())
        : (directFacultyId ? sendMessageApi({ text, recipientId: directFacultyId }) : Promise.reject())
      );
      setMessages((prev) => [...prev, created]);
      setTyping(true);
      setTimeout(() => setTyping(false), 1200);
    } catch {}
  };

  // call/meeting request option removed

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-3 text-sm text-slate-700">
        <div className="flex items-center gap-2">
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
            <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={directFacultyId ?? ''} onChange={(e) => setDirectFacultyId(e.target.value || null)}>
              {projects.filter((p) => p.facultyId)
                .map((p) => ({ id: p.facultyId!, name: p.facultyName || 'Faculty'}))
                .reduce((acc: Array<{id: string; name: string}>, curr) => acc.find(a => a.id === curr.id) ? acc : acc.concat(curr), [])
                .map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
            </select>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {mode === 'group' ? (
          projectId ? (
          messages.map((m) => (
            <div key={m._id} className={"flex " + (m.sender === 'student' ? 'justify-end' : 'justify-start')}>
              <div className={"max-w-[70%] rounded-lg px-3 py-2 text-sm " + (m.sender === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800')}>
                <p>{m.text}</p>
                <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))) : (
            <p className="text-xs text-slate-500">No project selected.</p>
          )
        ) : (
          directFacultyId ? (
            messages.map((m) => (
              <div key={m._id} className={"flex " + (m.sender === 'student' ? 'justify-end' : 'justify-start')}>
                <div className={"max-w-[70%] rounded-lg px-3 py-2 text-sm " + (m.sender === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800')}>
                  <p>{m.text}</p>
                  <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No faculty selected.</p>
          )
        )}
        {typing && <div className="text-xs text-slate-500">Someone is typing…</div>}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 p-3">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          placeholder={mode === 'group' ? (projectId ? "Type a message..." : "Select a project to chat") : (directFacultyId ? "Type a message..." : "Select a faculty to chat")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          disabled={(mode === 'group' && !projectId) || (mode === 'direct' && !directFacultyId)}
        />
        <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50" onClick={onSend} disabled={(mode === 'group' && !projectId) || (mode === 'direct' && !directFacultyId)}>Send</button>
      </div>
    </div>
  );
};
