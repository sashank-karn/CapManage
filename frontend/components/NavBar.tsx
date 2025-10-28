"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { publishToast } from "../lib/toast";

const links = [
  { href: "/dashboard", label: "Dashboard", roles: ["student", "faculty", "admin"] },
  { href: "/module1", label: "Module 1", roles: ["student", "faculty", "admin"] },
  { href: "/module2", label: "Module 2", roles: ["student"] },
  { href: "/module-3", label: "Module 3", roles: ["admin"] },
  { href: "/module-4", label: "Module 4", roles: ["faculty", "admin"] },
  { href: "/module-5", label: "Module 5", roles: ["student", "faculty"] },
  { href: "/module-6", label: "Module 6", roles: ["faculty", "admin"] },
  { href: "/module-7", label: "Module 7", roles: ["student", "faculty", "admin"] },
  { href: "/module-8", label: "Module 8", roles: ["faculty", "admin"] },
  { href: "/module9", label: "Module 9", roles: ["student", "faculty", "admin"] }
];

export const NavBar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleLinks = links.filter((link) => !user || link.roles.includes(user.role));

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
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
          {user ? (
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
