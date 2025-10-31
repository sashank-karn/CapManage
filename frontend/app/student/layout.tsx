import type { ReactNode } from 'react';
import { Sidebar } from '../../components/Sidebar';

const StudentLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex min-h-[calc(100vh-3.25rem)] w-full">
      <Sidebar />
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
};

export default StudentLayout;
