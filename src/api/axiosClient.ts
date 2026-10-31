import axios from 'axios';
import { clearToken, getToken, setToken } from '../lib/authStorage';

// baseURL = origin only (e.g. https://ahaliav.me). Paths = /api/admin/... so final URL has single /api
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ahaliav.me/api/',
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => {
    // Sliding session: the API sends a fresh token once the current one is a day old.
    const renewed = response.headers?.['x-auth-token'];
    if (typeof renewed === 'string' && renewed && getToken()) setToken(renewed);
    return response;
  },
  async (error) => {
    const onLogin = window.location.pathname === '/login';
    if (!onLogin && error.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
