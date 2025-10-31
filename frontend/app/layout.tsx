import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { NavBar } from '../components/NavBar';
import { ToastContainer } from '../components/ToastContainer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CapManage Suite',
  description: 'Capstone management platform derived from spreadsheet requirements'
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en" className="bg-slate-50 text-slate-900">
      <body className={inter.className}>
        <AuthProvider>
          <NavBar />
          <main className="min-h-[calc(100vh-3.25rem)] w-full px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
