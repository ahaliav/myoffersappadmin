import axios from 'axios';
import axiosClient from './axiosClient';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  isAdmin: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** The API answers sign-in errors with a stable code (invalid_credentials, password_reset_required, …). */
export interface AuthErrorInfo {
  code: string;
  message: string;
  status?: number;
}

export function toAuthError(e: unknown): AuthErrorInfo {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { code?: string; message?: string } | undefined;
    const status = e.response?.status;
    if (status === 429) return { code: 'too_many_requests', message: 'Too many attempts', status };
    return { code: data?.code ?? 'error', message: data?.message ?? e.message, status };
  }
  return { code: 'error', message: e instanceof Error ? e.message : String(e) };
}

// Same path convention as adminApi: baseURL ends in /api/ and the server's PathBase is /api.
export const authApi = {
  login: (email: string, password: string) =>
    axiosClient.post<AuthResponse>('/api/auth/login', { email, password }),

  google: (idToken: string) =>
    axiosClient.post<AuthResponse>('/api/auth/google', { idToken }),

  forgotPassword: (email: string) =>
    axiosClient.post('/api/auth/forgot-password', { email }),

  me: () => axiosClient.get<AuthUser>('/api/auth/me'),
};
