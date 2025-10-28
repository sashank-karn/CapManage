import { nanoid } from 'nanoid';

export type ToastLevel = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  level: ToastLevel;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();

export const publishToast = (message: string, level: ToastLevel = 'info'): ToastMessage => {
  const toast: ToastMessage = {
    id: nanoid(),
    message,
    level
  };
  listeners.forEach((listener) => listener(toast));
  return toast;
};

export const subscribeToToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
