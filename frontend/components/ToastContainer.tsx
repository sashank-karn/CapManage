"use client";

import { useEffect, useState } from 'react';
import type { ToastMessage } from '../lib/toast';
import { subscribeToToasts } from '../lib/toast';

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((current: ToastMessage[]) => [...current, toast]);
      setTimeout(() => {
        setToasts((current: ToastMessage[]) => current.filter((item) => item.id !== toast.id));
      }, 4000);
    });

    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  {toasts.map((toast: ToastMessage) => (
        <div
          key={toast.id}
          className={`rounded-md border px-4 py-3 shadow-lg backdrop-blur-sm ${
            toast.level === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : toast.level === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-sky-200 bg-sky-50 text-sky-900"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};
