"use client";

import { Bell, Search, User2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getNotifications } from "../../services/studentDashboard";

export const StudentHeader = ({ title = "Student Dashboard" }: { title?: string }) => {
  const { user, initialized, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await getNotifications();
        if (mounted) setUnread(list.filter((n) => !n.sentAt).length);
      } catch {
        // ignore if not logged in or API unavailable
      }
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">🎓 {title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600 sm:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            placeholder="Search..."
            className="w-56 outline-none placeholder:text-slate-400"
          />
        </div>

        <button className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        <div className="group relative">
          <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <User2 className="h-4 w-4" />
            <span className="hidden sm:block">{initialized && user ? user.name : 'Account'}</span>
          </button>
          <div className="invisible absolute right-0 z-10 mt-2 w-40 rounded-md border border-slate-200 bg-white p-1 text-sm text-slate-700 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
            <button className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50">Profile</button>
            <button className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50">Settings</button>
            <button className="w-full rounded px-2 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => logout()}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
