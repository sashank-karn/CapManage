"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState, useMemo } from "react";
import { LayoutDashboard, CalendarClock, LineChart, MessageSquare, ListTodo, Bell, Settings2, Inbox, PanelsTopLeft, PanelLeftClose, PanelLeftOpen, SquareGanttChart, UserCog } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<"admin" | "faculty" | "student">;
};

const navItems: NavItem[] = [
  // Student section (under /student only)
  { href: "/student", label: "Dashboard Overview", icon: LayoutDashboard, roles: ["student"] },
  { href: "/student/deadlines", label: "Deadlines & Notices", icon: CalendarClock, roles: ["student"] },
  { href: "/student/progress", label: "Submissions & Progress", icon: LineChart, roles: ["student"] },
  { href: "/student/feedback", label: "Feedback & Activities", icon: Inbox, roles: ["student"] },
  { href: "/student/messages", label: "Messages", icon: MessageSquare, roles: ["student"] },
  { href: "/student/todo", label: "To-Do List", icon: ListTodo, roles: ["student"] },
  { href: "/student/customization", label: "Customization", icon: Settings2, roles: ["student"] },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, initialized } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const items = useMemo(
    () => (initialized ? navItems : navItems).filter((i) => !i.roles || (user && i.roles.includes(user.role))),
    [initialized, user]
  );

  return (
    <aside
      className={
        "hidden overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 md:block " +
        (collapsed ? "md:w-16" : "md:w-64")
      }
      aria-label="Sidebar"
      aria-expanded={!collapsed}
    >
      <div className="sticky top-[3.25rem] flex h-[calc(100vh-3.25rem)] flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-2 pt-3">
          <div className={(collapsed ? "hidden" : "flex") + " items-center gap-2"}>
            <PanelsTopLeft className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</span>
          </div>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "group flex items-center rounded-md py-2 text-sm font-medium transition " +
                  (collapsed ? "justify-center px-2" : "gap-3 px-3") + " " +
                  (active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900")
                }
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-700" />
                {!collapsed && <span className="block truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={(collapsed ? "hidden" : "block") + " px-4 pb-4 pt-2 text-xs text-slate-400"}>© {new Date().getFullYear()} CapManage</div>
      </div>
    </aside>
  );
};
