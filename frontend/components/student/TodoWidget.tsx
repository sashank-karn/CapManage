"use client";

import { useEffect, useMemo, useState } from "react";
import { createTodo, deleteTodo, getTodos, updateTodo } from "../../services/studentDashboard";

type Todo = { _id: string; title: string; completed: boolean; dueDate?: string };

export const TodoWidget = ({ large = false }: { large?: boolean }) => {
  const [items, setItems] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await getTodos();
        if (mounted) setItems(list);
      } catch {
        // Fallback to localStorage
        const raw = localStorage.getItem('todos');
        if (raw && mounted) setItems(JSON.parse(raw));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(items));
  }, [items]);

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    try {
      const created = await createTodo(t);
      setItems((prev) => [created, ...prev]);
    } catch {
      const local: Todo = { _id: Math.random().toString(36).slice(2), title: t, completed: false };
      setItems((prev) => [local, ...prev]);
    }
  };

  const toggle = async (id: string, completed: boolean) => {
    try {
      const updated = await updateTodo(id, { completed });
      setItems((prev) => prev.map((x) => (x._id === id ? updated : x)));
    } catch {
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, completed } : x)));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteTodo(id);
    } catch {}
    setItems((prev) => prev.filter((x) => x._id !== id));
  };

  const containerClass = large ? "h-[560px]" : "h-[360px]";

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${containerClass}`}>
      <div className="border-b border-slate-200 p-3 text-sm font-medium text-slate-700">To-Do List</div>
      <div className="flex items-center gap-2 p-3">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500" onClick={add}>Add</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="h-40 animate-pulse rounded-md bg-slate-100" />
        ) : (
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t._id} className="flex items-center justify-between rounded-md border border-slate-200 p-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={t.completed} onChange={(e) => toggle(t._id, e.target.checked)} />
                  <span className={"text-sm " + (t.completed ? 'line-through text-slate-500' : 'text-slate-800')}>{t.title}</span>
                </label>
                <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50" onClick={() => remove(t._id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
