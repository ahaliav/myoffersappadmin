import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RolePermissions from './RolePermissions';
import type { RoleMatrix } from '../api/rolePermissionsApi';

vi.mock('../api/rolePermissionsApi', async (orig) => ({
  ...(await orig<typeof import('../api/rolePermissionsApi')>()),
  rolePermissionsApi: { matrix: vi.fn(), set: vi.fn(), history: vi.fn() },
}));

import { rolePermissionsApi } from '../api/rolePermissionsApi';
const api = vi.mocked(rolePermissionsApi);

const cell = (allowed: boolean, businessOverrides = 0) => ({ allowed, stored: true, updatedAt: '2026-11-01T08:00:00Z', updatedBy: 1, businessOverrides });
const matrix: RoleMatrix = {
  roles: ['manager', 'employee'],
  permissions: [
    { permission: 'money.view', grantable: true, roles: { manager: cell(true), employee: cell(false, 2) } },
    { permission: 'members.manage', grantable: false, roles: { manager: cell(false), employee: cell(false) } },
  ],
};

describe('RolePermissions (B10 global matrix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.matrix.mockResolvedValue(matrix);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(cleanup);

  it('shows each permission for manager and employee, with the businesses that override it', async () => {
    render(<RolePermissions />);
    expect(await screen.findByText('רואה סכומים ומחירים')).toBeTruthy();
    expect((screen.getByLabelText('רואה סכומים ומחירים מנהל') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('רואה סכומים ומחירים עובד') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('2 עסקים הגדירו בעצמם')).toBeTruthy();
    // members.manage stays the owner's: it can't be switched on.
    expect((screen.getByLabelText('מנהל את הצוות מנהל') as HTMLInputElement).disabled).toBe(true);
  });

  it('turns a permission on for employees after a confirm and reloads', async () => {
    api.set.mockResolvedValue({ changed: true });
    render(<RolePermissions />);
    fireEvent.click(await screen.findByLabelText('רואה סכומים ומחירים עובד'));
    await waitFor(() => expect(api.set).toHaveBeenCalledWith('employee', 'money.view', true));
    expect(await screen.findByText(/נשמר: רואה סכומים ומחירים — עובד: מותר/)).toBeTruthy();
    expect(api.matrix).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the confirm is cancelled, and says why the server refused', async () => {
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    render(<RolePermissions />);
    fireEvent.click(await screen.findByLabelText('רואה סכומים ומחירים עובד'));
    expect(api.set).not.toHaveBeenCalled();

    api.set.mockRejectedValue({ response: { data: { code: 'cannot_grant' } } });
    fireEvent.click(screen.getByLabelText('רואה סכומים ומחירים מנהל'));
    expect(await screen.findByText('ניהול הצוות נשאר רק לבעלים.')).toBeTruthy();
  });

  it('shows the history of changes', async () => {
    api.history.mockResolvedValue([
      { id: 2, role: 'employee', permission: 'money.view', oldAllowed: false, newAllowed: true, actorUserId: 7, createdAt: '2026-11-02T08:00:00Z' },
    ]);
    render(<RolePermissions />);
    fireEvent.click(await screen.findByText('היסטוריית שינויים'));
    expect(await screen.findByText(/עובד · רואה סכומים ומחירים: אסור ← מותר/)).toBeTruthy();
    expect(screen.getByText(/מנהל מערכת #7/)).toBeTruthy();
  });
});
