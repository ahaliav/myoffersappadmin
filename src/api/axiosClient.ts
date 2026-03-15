import axios from 'axios';
import { supabase, clearSupabaseAuthStorage } from '../lib/supabaseClient';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ahaliav.me/api/',
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Basic ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const data = error.response?.data;
    const isSessionNotFound =
      data?.code === 'session_not_found' ||
      (typeof data?.message === 'string' && data.message.includes('session_not_found'));
    const currentPath = window.location.pathname;
    const shouldRedirect =
      currentPath !== '/login' &&
      !currentPath.includes('reset-password');

    if (shouldRedirect && (error.response?.status === 401 || isSessionNotFound)) {
      clearSupabaseAuthStorage();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
