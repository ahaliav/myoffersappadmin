import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import type { AuthErrorInfo } from '../api/authApi';

vi.mock('../api/authApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/authApi')>();
  return { ...original, authApi: { login: vi.fn(), google: vi.fn(), forgotPassword: vi.fn(), me: vi.fn() } };
});

import { authApi } from '../api/authApi';
const api = vi.mocked(authApi);

const admin = { id: 1, fullName: 'Admin', email: 'admin@example.com', isAdmin: true, emailVerified: true, hasPassword: true, hasGoogle: false };
const member = { ...admin, id: 2, email: 'member@example.com', isAdmin: false };

let auth: ReturnType<typeof useAuth>;
const expose = (value: ReturnType<typeof useAuth>) => {
  auth = value;
};

function Probe() {
  const value = useAuth();
  useEffect(() => expose(value));
  return <div>{value.loading ? 'loading' : value.user ? `user:${value.user.email}` : 'signed-out'}</div>;
}

describe('Admin sign-in (own API, no Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it('keeps the token of an admin who signs in', async () => {
    api.login.mockResolvedValue({ data: { token: 'admin-token', user: admin } } as never);
    render(<AuthProvider><Probe /></AuthProvider>);

    let result: { error: AuthErrorInfo | null } = { error: null };
    await act(async () => {
      result = await auth.signIn(' admin@example.com ', 'secret password');
    });

    expect(result.error).toBeNull();
    expect(api.login).toHaveBeenCalledWith('admin@example.com', 'secret password');
    expect(window.localStorage.getItem('tooday_admin_token')).toBe('admin-token');
    expect(screen.getByText('user:admin@example.com')).toBeTruthy();
  });

  it('refuses a user who is not an admin and keeps no token', async () => {
    api.login.mockResolvedValue({ data: { token: 'member-token', user: member } } as never);
    render(<AuthProvider><Probe /></AuthProvider>);

    let result: { error: AuthErrorInfo | null } = { error: null };
    await act(async () => {
      result = await auth.signIn('member@example.com', 'secret password');
    });

    expect(result.error?.code).toBe('not_admin');
    expect(window.localStorage.getItem('tooday_admin_token')).toBeNull();
    expect(screen.getByText('signed-out')).toBeTruthy();
  });

  it("passes on the server's code, e.g. an account that still has to choose a password", async () => {
    api.login.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 403, data: { code: 'password_reset_required', message: 'no password yet' } },
    });
    render(<AuthProvider><Probe /></AuthProvider>);

    let result: { error: AuthErrorInfo | null } = { error: null };
    await act(async () => {
      result = await auth.signIn('admin@example.com', 'whatever 123');
    });

    expect(result.error?.code).toBe('password_reset_required');
  });

  it('restores the session from a stored token', async () => {
    window.localStorage.setItem('tooday_admin_token', 'stored');
    api.me.mockResolvedValue({ data: admin } as never);
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('user:admin@example.com')).toBeTruthy());
  });

  it('drops a stored token that the server no longer accepts', async () => {
    window.localStorage.setItem('tooday_admin_token', 'stale');
    api.me.mockRejectedValue({ response: { status: 401 } });
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(window.localStorage.getItem('tooday_admin_token')).toBeNull();
  });
});
