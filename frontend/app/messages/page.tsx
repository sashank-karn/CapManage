"use client";

import { StudentHeader } from '../../components/student/StudentHeader';
import { ChatPanel } from '../../components/student/ChatPanel';
import { RoleGate } from '../../components/RoleGate';

const MessagesPage = () => {
  return (
    <RoleGate roles={["student"]}>
      <div className="space-y-4">
        <StudentHeader title="Messages" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChatPanel />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">Conversations</p>
            <p className="mt-2 text-xs text-slate-500">Faculty and team threads will appear here.</p>
          </div>
        </div>
      </div>
    </RoleGate>
  );
};

export default MessagesPage;
