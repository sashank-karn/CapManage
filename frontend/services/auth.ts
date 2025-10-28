import api from './api';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'faculty';
  isEmailVerified: boolean;
  isActive: boolean;
  facultyStatus?: 'pending' | 'approved' | 'rejected';
}

interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
}

export const registerStudent = async (payload: {
  name: string;
  email: string;
  enrollmentId: string;
  password: string;
}): Promise<void> => {
  await api.post('/auth/register/student', payload);
};

export const registerFaculty = async (payload: {
  name: string;
  email: string;
  password: string;
  department: string;
  designation: string;
  expertise?: string;
}): Promise<void> => {
  await api.post('/auth/register/faculty', payload);
};

export const verifyEmail = async (token: string): Promise<void> => {
  await api.post('/auth/verify-email', { token });
};

export const login = async (payload: { email: string; password: string }): Promise<AuthResponse> => {
  const { data } = await api.post('/auth/login', payload);
  return data.data as AuthResponse;
};

export const refreshSession = async (refreshToken: string): Promise<AuthResponse> => {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  return data.data as AuthResponse;
};

export const logout = async (refreshToken: string): Promise<void> => {
  await api.post('/auth/logout', { refreshToken });
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post('/auth/password/request-reset', { email });
};

export const resetPassword = async (token: string, password: string): Promise<void> => {
  await api.post('/auth/password/reset', { token, password });
};
