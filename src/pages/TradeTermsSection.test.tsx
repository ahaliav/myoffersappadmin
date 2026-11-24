import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TradeTermsSection from './TradeTermsSection';

vi.mock('../api/chatTradeQuestionsApi', async (orig) => ({
  ...(await orig<typeof import('../api/chatTradeQuestionsApi')>()),
  tradeTermsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
}));

import { tradeTermsApi } from '../api/chatTradeQuestionsApi';
const api = vi.mocked(tradeTermsApi);

describe('TradeTermsSection (AI-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ data: [{ id: 1, trade: 'איטום', terms: 'ממברנה, יריעות', isActive: true, updatedAt: '', updatedBy: null }] } as never);
    api.create.mockResolvedValue({ data: {} } as never);
    api.deactivate.mockResolvedValue({} as never);
  });
  afterEach(cleanup);

  it('lists the trades with their words, adds a list and turns one off', async () => {
    render(<TradeTermsSection />);
    expect(await screen.findByText('ממברנה, יריעות')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /רשימה חדשה/ }));
    fireEvent.change(screen.getByLabelText('מקצוע'), { target: { value: 'צבע' } });
    fireEvent.change(screen.getByLabelText('מילים'), { target: { value: 'שפכטל, טמבור' } });
    fireEvent.click(screen.getByRole('button', { name: /שמירה/ }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ trade: 'צבע', terms: 'שפכטל, טמבור', isActive: true }));
    fireEvent.click(screen.getByRole('button', { name: 'כיבוי' }));
    await waitFor(() => expect(api.deactivate).toHaveBeenCalledWith(1));
  });

  it('shows the server message when a trade already has a list', async () => {
    api.create.mockRejectedValue({ response: { data: { message: 'למקצוע הזה כבר יש רשימה' } } });
    render(<TradeTermsSection />);
    await screen.findByText('ממברנה, יריעות');
    fireEvent.click(screen.getByRole('button', { name: /רשימה חדשה/ }));
    fireEvent.change(screen.getByLabelText('מילים'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /שמירה/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('למקצוע הזה כבר יש רשימה');
  });
});
