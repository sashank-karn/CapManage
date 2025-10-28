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
          <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-6">
            {children}
          </main>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
