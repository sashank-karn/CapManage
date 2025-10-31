import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CapManage Auth',
  description: 'Authentication pages'
};

// Important: This is a segment layout that renders INSIDE the root layout.
// Do NOT include <html>/<body> or duplicate providers here to avoid hydration mismatches.
const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.25rem)] max-w-md flex-col gap-6 px-4 py-8 sm:max-w-lg">
      {children}
    </div>
  );
};

export default AuthLayout;
