import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1',
  withCredentials: true
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    const headers = config.headers as unknown as {
      set?: (name: string, value: string) => void;
      [key: string]: unknown;
    };
    if (typeof headers.set === 'function') {
      headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }
  return config;
});

export default api;

// Global 401 handler: clear token and send to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Clear in-module access token
      accessToken = null;
      if (typeof window !== 'undefined') {
        // Avoid infinite loop if already on login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
