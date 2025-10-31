"use client";

import { useRequireAuth } from "../hooks/useRequireAuth";
import type { ReactNode } from "react";

export const RoleGate = ({ roles, children }: { roles: Array<'student' | 'faculty' | 'admin'>; children: ReactNode }) => {
  const { initialized, authorized } = useRequireAuth({ roles, redirectTo: '/login', silent: true });

  if (!initialized) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
};
