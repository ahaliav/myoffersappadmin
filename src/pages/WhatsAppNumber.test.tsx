import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WhatsAppChannel from './WhatsAppChannel';

vi.mock('../api/whatsAppAdminApi', async (orig) => ({
  ...(await orig<typeof import('../api/whatsAppAdminApi')>()),
  whatsAppAdminApi: {
    health: vi.fn(), settings: vi.fn(), setSetting: vi.fn(), businesses: vi.fn(), setBusiness: vi.fn(),
    texts: vi.fn(), setText: vi.fn(), log: vi.fn(), links: vi.fn(), dead: vi.fn(), requeue: vi.fn(),
    number: vi.fn(), registerNumber: vi.fn(), subscribe: vi.fn(), setNumber: vi.fn(),
  },
}));

import { whatsAppAdminApi } from '../api/whatsAppAdminApi';
const api = vi.mocked(whatsAppAdminApi);

// Joshua 28.11: the real number 050-583-1847 switched from the admin, without the server.
const fileState = { phoneNumberId: '111111111111', botNumber: '972500000000', source: 'file' as const, filePhoneNumberId: '111111111111', fileBotNumber: '972500000000' };

const openTab = async () => {
  render(<WhatsAppChannel />);
  fireEvent.click(await screen.findByText('מספר הבוט'));
  await screen.findByLabelText('המספר שבשימוש');
};

describe('מספר הבוט', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.health.mockResolvedValue({ status: 'ok', enabled: true, canReceive: true, canSend: true, queue: { queued: 0, processing: 0, dead: 0, failed: 0, oldestQueuedAt: null, lastReceivedAt: null }, sentLastHour: 0, failedLastHour: 0, inboundLastHour: 0, alerts: [], counters: {} });
    api.dead.mockResolvedValue([]);
    api.number.mockResolvedValue({ state: fileState, hasToken: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(cleanup);

  it('shows the number in use and where it comes from', async () => {
    await openTab();
    expect(screen.getByText('972500000000')).toBeTruthy();
    expect(screen.getByText(/הקובץ של השרת/)).toBeTruthy();
  });

  it('registers with the PIN, and the PIN is gone from the screen right after', async () => {
    api.registerNumber.mockResolvedValue({ id: '1460435107154085', success: true, status: 200, message: 'success' });
    await openTab();
    const button = screen.getByText('לרשום את המספר') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('צעד 1: רישום המספר').querySelector('input')!, { target: { value: '1460435107154085' } });
    const pin = screen.getByLabelText('PIN') as HTMLInputElement;
    expect(pin.type).toBe('password');
    fireEvent.change(pin, { target: { value: '48a2917' } }); // digits only, 6 at most
    expect(pin.value).toBe('482917');
    fireEvent.click(button);
    await waitFor(() => expect(api.registerNumber).toHaveBeenCalledWith('1460435107154085', '482917'));
    expect(pin.value).toBe('');
    expect(await screen.findByText('✓ מטא אישרה: המספר רשום.')).toBeTruthy();
  });

  it('shows what Meta answered for each account id; one success is enough', async () => {
    api.subscribe.mockResolvedValue({ anySuccess: true, results: [
      { id: '1652281143307230', success: true, status: 200, message: 'success' },
      { id: '1813842429849300', success: false, status: 400, message: '100 Unsupported post request' },
    ] });
    await openTab();
    fireEvent.change(screen.getByPlaceholderText('1652281143307230, 1813842429849300'), { target: { value: '1652281143307230, 1813842429849300' } });
    fireEvent.click(screen.getByText('לחבר'));
    await waitFor(() => expect(api.subscribe).toHaveBeenCalledWith(['1652281143307230', '1813842429849300']));
    expect(await screen.findByText(/100 Unsupported post request/)).toBeTruthy();
    expect(screen.getByText('מספיק: אחד המזהים חובר.')).toBeTruthy();
  });

  it('switches the number after a confirm, and can go back to the file', async () => {
    api.setNumber.mockResolvedValueOnce({ state: { ...fileState, phoneNumberId: '1460435107154085', botNumber: '972505831847', source: 'admin' } });
    await openTab();
    const step3 = screen.getByLabelText('צעד 3: החלפת המספר');
    const [idInput, phoneInput] = Array.from(step3.querySelectorAll('input'));
    fireEvent.change(idInput, { target: { value: '1460435107154085' } });
    fireEvent.change(phoneInput, { target: { value: '050-583-1847' } });
    fireEvent.click(screen.getByText('להחליף את המספר'));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('050-583-1847'));
    await waitFor(() => expect(api.setNumber).toHaveBeenCalledWith('1460435107154085', '050-583-1847'));
    expect(await screen.findByText('המספר הוחלף. הבוט שולח עכשיו מהמספר החדש.')).toBeTruthy();
    expect(screen.getByText('972505831847')).toBeTruthy();

    api.setNumber.mockResolvedValueOnce({ state: fileState });
    fireEvent.click(screen.getByText('לחזור למספר שבקובץ של השרת'));
    await waitFor(() => expect(api.setNumber).toHaveBeenLastCalledWith('', ''));
  });

  it('a cancelled confirm changes nothing', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    await openTab();
    const step3 = screen.getByLabelText('צעד 3: החלפת המספר');
    const [idInput, phoneInput] = Array.from(step3.querySelectorAll('input'));
    fireEvent.change(idInput, { target: { value: '1460435107154085' } });
    fireEvent.change(phoneInput, { target: { value: '050-583-1847' } });
    fireEvent.click(screen.getByText('להחליף את המספר'));
    expect(api.setNumber).not.toHaveBeenCalled();
  });
});
