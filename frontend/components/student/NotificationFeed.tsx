"use client";

import { useEffect, useState } from "react";
import { getNotifications, markNotificationRead } from "../../services/studentDashboard";

type Item = { _id: string; title: string; message: string; createdAt: string; sentAt?: string; module: string };

export const NotificationFeed = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await getNotifications();
        if (mounted) setItems(list);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, sentAt: new Date().toISOString() } : n)));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Notifications</p>
      </div>
      {loading ? (
        <div className="h-40 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n._id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{n.title ?? n.module}</p>
                <p className="text-xs text-slate-600">{n.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!n.sentAt && (
                  <button
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => markRead(n._id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
