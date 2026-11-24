import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiGuards from './AiGuards';

vi.mock('../api/aiGuardsApi', async (orig) => ({
  ...(await orig<typeof import('../api/aiGuardsApi')>()),
  aiGuardsApi: { list: vi.fn(), set: vi.fn() },
}));

import { aiGuardsApi, type AiGuard } from '../api/aiGuardsApi';
const api = vi.mocked(aiGuardsApi);

const guard = (over: Partial<AiGuard>): AiGuard => ({
  key: 'competitor_same_work', area: 'Today smart', label: 'השוואה למתחרה: "לא כתוב אצלם"', does: 'משאיר ב-missing רק שירותים מאותה עבודה.',
  locked: false, on: true, setting: 'ai_guard.competitor_same_work', threshold: null, firedLast7Days: 3, lastFiredAt: null, ...over,
});
const qc = guard({
  key: 'quote_chat_guard', area: "צ'אט ההצעה", label: 'מה שהמשתמש לא אמר', setting: 'ai_guard.quote_chat_guard', firedLast7Days: 0,
  threshold: { key: 'qc_guard_min_said_pct', label: 'תיאור נשאר כשלפחות % מהמילים שלו נאמרו', min: 50, max: 100, default: 70, value: 70 },
});
const locked = guard({ key: 'client_agent_quote_ids', area: 'כרטיס לקוח', label: 'מספרי הצעות של לקוחות אחרים', locked: true, setting: 'ai_guard.client_agent_quote_ids' });

describe('AiGuards (AI-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ data: [guard({}), qc, locked] } as never);
    api.set.mockImplementation(async (key, body) => ({ data: { ...[guard({}), qc, locked].find((g) => g.key === key)!, ...('on' in body ? { on: body.on } : {}) } }) as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(cleanup);

  const renderPage = () => render(<MemoryRouter><AiGuards /></MemoryRouter>);

  it('lists the guards by area with how often each acted and a link to its traces', async () => {
    renderPage();
    expect(await screen.findByText('Today smart')).toBeTruthy();
    expect(screen.getByText("צ'אט ההצעה")).toBeTruthy();
    expect(screen.getAllByText(/פעל 3 פעמים ב-7 הימים האחרונים/)).toHaveLength(2);
    expect(screen.getByText(/פעל 0 פעמים/)).toBeTruthy();
    const links = screen.getAllByText('לרישומים');
    expect(links[0].getAttribute('href')).toBe('/ai-traces?kind=guard&promptKey=competitor_same_work');
  });

  it('turns a guard off after confirming, and saves a threshold', async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText('השוואה למתחרה: "לא כתוב אצלם": פעיל'));
    await waitFor(() => expect(api.set).toHaveBeenCalledWith('competitor_same_work', { on: false }));
    expect(await screen.findByText('כבוי', { selector: 'span' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('מה שהמשתמש לא אמר: רף'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }));
    await waitFor(() => expect(api.set).toHaveBeenCalledWith('quote_chat_guard', { threshold: 60 }));
  });

  it('a locked guard has no switch', async () => {
    renderPage();
    await screen.findByText('מספרי הצעות של לקוחות אחרים');
    expect(screen.queryByLabelText('מספרי הצעות של לקוחות אחרים: פעיל')).toBeNull();
    expect(screen.getByText('נרשם בלבד')).toBeTruthy();
  });
});
