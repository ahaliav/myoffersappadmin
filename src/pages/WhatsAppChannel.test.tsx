import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WhatsAppChannel from './WhatsAppChannel';
import type { WaBusiness, WaHealth } from '../api/whatsAppAdminApi';

vi.mock('../api/whatsAppAdminApi', async (orig) => ({
  ...(await orig<typeof import('../api/whatsAppAdminApi')>()),
  whatsAppAdminApi: {
    health: vi.fn(), settings: vi.fn(), setSetting: vi.fn(), businesses: vi.fn(), setBusiness: vi.fn(),
    texts: vi.fn(), setText: vi.fn(), log: vi.fn(), links: vi.fn(), dead: vi.fn(), requeue: vi.fn(),
  },
}));

import { whatsAppAdminApi } from '../api/whatsAppAdminApi';
const api = vi.mocked(whatsAppAdminApi);

const health: WaHealth = {
  status: 'degraded', enabled: true, canReceive: true, canSend: false,
  queue: { queued: 3, processing: 1, dead: 2, failed: 0, oldestQueuedAt: '2026-11-16T08:00:00Z', lastReceivedAt: '2026-11-16T08:05:00Z' },
  sentLastHour: 10, failedLastHour: 4, inboundLastHour: 12, alerts: ['access token or phone id missing'], counters: { 'wa.denied': 3 },
};

const biz = (p: Partial<WaBusiness>): WaBusiness => ({
  id: 1, name: 'שיפוצי אלון', configured: true, enabled: true, phaseActive: 2, beta: true, dailyMessagesCap: null,
  roles: 'owner,manager,employee', updatedAt: '2026-11-15T08:00:00Z', links: 2, ...p,
});

describe('WhatsAppChannel (ערוץ וואטסאפ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.health.mockResolvedValue(health);
    api.dead.mockResolvedValue([{ id: 9, waMessageId: 'wamid.x', type: 'text', receivedAt: '2026-11-16T07:00:00Z', attempts: 5, lastError: 'Graph 401' }]);
    api.businesses.mockResolvedValue([biz({}), biz({ id: 2, name: null, configured: false, enabled: false, beta: false, phaseActive: null, links: 0 })]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(cleanup);

  it('shows the status, the alerts and the dead letters, and requeues them', async () => {
    api.requeue.mockResolvedValue({ requeued: 1 });
    render(<WhatsAppChannel />);
    expect(await screen.findByText('תקלה')).toBeTruthy();
    expect(screen.getByText('access token or phone id missing')).toBeTruthy();
    expect(screen.getByText('Graph 401')).toBeTruthy();
    fireEvent.click(screen.getByText('החזר הכול לתור'));
    await waitFor(() => expect(api.requeue).toHaveBeenCalled());
    expect(await screen.findByText('הוחזרו לתור 1 הודעות.')).toBeTruthy();
  });

  it('switches on a business that was never set up, and searches', async () => {
    api.setBusiness.mockResolvedValue({});
    render(<WhatsAppChannel />);
    fireEvent.click(await screen.findByText('עסקים'));
    expect(await screen.findByText('לא הוגדר')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('פעיל 2'));
    await waitFor(() => expect(api.setBusiness).toHaveBeenCalledWith(2, { enabled: true }));
    expect(window.confirm).not.toHaveBeenCalled(); // turning on needs no confirm

    fireEvent.change(screen.getByLabelText('שלב 1'), { target: { value: '3' } });
    await waitFor(() => expect(api.setBusiness).toHaveBeenCalledWith(1, { phaseActive: 3 }));

    fireEvent.change(screen.getByLabelText('חיפוש עסק'), { target: { value: 'אלון' } });
    fireEvent.click(screen.getByText('חיפוש'));
    await waitFor(() => expect(api.businesses).toHaveBeenLastCalledWith('אלון'));
  });

  it('asks before narrowing who may connect, and shows the server reason on a bad value', async () => {
    api.setBusiness.mockRejectedValue({ response: { data: { code: 'bad_roles' } } });
    render(<WhatsAppChannel />);
    fireEvent.click(await screen.findByText('עסקים'));
    fireEvent.change(await screen.findByLabelText('תפקידים 1'), { target: { value: 'owner' } });
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('ינותק מוואטסאפ מיד'));
    await waitFor(() => expect(api.setBusiness).toHaveBeenCalledWith(1, { roles: 'owner' }));
    expect(await screen.findByText(/owner חייב להיות ברשימה/)).toBeTruthy();
  });

  it('edits a number setting and confirms before the global switch goes off', async () => {
    api.settings.mockResolvedValue({ effective: {}, rows: [
      { key: 'wa.enabled_global', value: 'true', description: 'מתג לכולם', updatedAt: null, updatedBy: null },
      { key: 'wa.daily_messages_cap', value: '60', description: null, updatedAt: null, updatedBy: null },
    ] });
    api.setSetting.mockResolvedValue({ key: 'x', value: 'y' });
    render(<WhatsAppChannel />);
    fireEvent.click(await screen.findByText('הגדרות'));
    fireEvent.change(await screen.findByLabelText('wa.daily_messages_cap'), { target: { value: '80' } });
    fireEvent.click(screen.getByLabelText('שמור wa.daily_messages_cap'));
    await waitFor(() => expect(api.setSetting).toHaveBeenCalledWith('wa.daily_messages_cap', '80'));

    fireEvent.click(screen.getByLabelText('wa.enabled_global'));
    expect(window.confirm).toHaveBeenCalledWith('לכבות את הבוט לכל העסקים?');
    await waitFor(() => expect(api.setSetting).toHaveBeenCalledWith('wa.enabled_global', 'false'));
  });

  it('will not save a button text over 20 characters', async () => {
    api.texts.mockResolvedValue([{ key: 'wa.buttons.confirm', textHe: 'אישור', description: null, updatedAt: null, updatedBy: null }]);
    render(<WhatsAppChannel />);
    fireEvent.click(await screen.findByText('טקסטים'));
    fireEvent.change(await screen.findByLabelText('wa.buttons.confirm'), { target: { value: 'כפתור עם טקסט ארוך מדי' } });
    expect(screen.getByText('22 / 20')).toBeTruthy();
    expect((screen.getByLabelText('שמור wa.buttons.confirm') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('wa.buttons.confirm'), { target: { value: 'מאשר' } });
    fireEvent.click(screen.getByLabelText('שמור wa.buttons.confirm'));
    await waitFor(() => expect(api.setText).toHaveBeenCalledWith('wa.buttons.confirm', 'מאשר'));
  });

  it('shows the log and the links with masked phones only', async () => {
    api.log.mockResolvedValue([{ id: 1, createdAt: '2026-11-16T08:00:00Z', direction: 'in', businessId: 1, userId: 5, type: 'text', text: 'כמה דנה חייבת?',
      transcript: null, intent: 'customer', outcome: 'answered', status: null, error: null, traceId: null, phone: 'ab12cd34' }]);
    api.links.mockResolvedValue([{ id: 3, businessId: 1, userId: 5, status: 'linked', linkedAt: '2026-11-10T08:00:00Z', lastInboundAt: null,
      revokedAt: null, revokeReason: null, consentVersion: '2026-11', phone: '+97250***4567' }]);
    render(<WhatsAppChannel />);
    fireEvent.click(await screen.findByText('יומן הודעות'));
    expect(await screen.findByText('כמה דנה חייבת?')).toBeTruthy();
    expect(screen.getByText('ab12cd34')).toBeTruthy();
    fireEvent.click(screen.getByText('חיבורים'));
    expect(await screen.findByText('+97250***4567')).toBeTruthy();
    expect(screen.getByText('מחובר')).toBeTruthy();
  });
});
