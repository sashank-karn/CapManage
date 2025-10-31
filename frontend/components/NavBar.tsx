"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { publishToast } from "../lib/toast";

const links = [
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/admin/stats", label: "Dept Stats", roles: ["admin"] },
  { href: "/faculty", label: "Faculty", roles: ["faculty"] },
  { href: "/faculty/evaluations", label: "Evaluation Overview", roles: ["faculty"] },
  { href: "/faculty/groups", label: "Groups", roles: ["faculty"] },
  { href: "/faculty/messages", label: "Messages", roles: ["faculty"] },
  { href: "/student", label: "Student", roles: ["student"] },
  { href: "/student/messages", label: "Messages", roles: ["student"] },
  { href: "/student/submissions", label: "Submissions", roles: ["student"] }
];

export const NavBar = () => {
  const pathname = usePathname();
  const { user, logout, initialized } = useAuth();

  // Only show role-gated links after auth is initialized to avoid SSR/CSR mismatch
  const visibleLinks = initialized && user ? links.filter((link) => link.roles.includes(user.role)) : [];

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[120rem] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          CapManage
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-indigo-600"
                  : "transition hover:text-indigo-600"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {!initialized ? (
            // Keep SSR/CSR consistent while auth state hydrates
            <div className="h-8 w-28 animate-pulse rounded bg-slate-200" aria-hidden />
          ) : user ? (
            <>
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  publishToast("You have been signed out", "info");
                }}
                className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-indigo-600 hover:underline">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-indigo-600 px-3 py-1 text-white transition hover:bg-indigo-500"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
