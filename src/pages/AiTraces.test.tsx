import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AiTraces from './AiTraces';

vi.mock('../api/aiTracesApi', () => ({
  aiTracesApi: { list: vi.fn(), get: vi.fn(), remove: vi.fn(), removeBefore: vi.fn(), settings: vi.fn(), setSettings: vi.fn() },
}));

import { aiTracesApi } from '../api/aiTracesApi';
const api = vi.mocked(aiTracesApi);

const call = {
  id: 11, createdAt: '2026-11-06T10:00:00Z', kind: 'call', userId: 6, operation: 'writing', promptKey: 'extract_work_items', mode: 'quote_chat',
  subject: 'quote chat 5', correlationId: 'req-1', provider: 'openai', model: 'gpt-4o-mini', viaFallback: false, attempt: 1,
  inputTokens: 900, outputTokens: 120, cachedTokens: 0, costUsd: 0.0003, latencyMs: 1400, outcome: 'success', errorMessage: null,
  responsePreview: '{"sections":[]}',
};
const guard = { ...call, id: 12, kind: 'guard', promptKey: 'quote_chat_guard', provider: null, model: null, outcome: 'removed', responsePreview: null };

describe('AiTraces (B1 "מה קרה בקריאה")', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.settings.mockResolvedValue({ data: { value: 'users:6', retentionDays: 14, updatedAt: null, updatedBy: null, count: 2, oldest: call.createdAt } } as never);
    api.list.mockResolvedValue({ data: { total: 2, page: 1, pageSize: 50, rows: [guard, call], promptKeys: ['extract_work_items'] } } as never);
  });
  afterEach(cleanup);

  it('shows the switch and the kept calls', async () => {
    render(<AiTraces />);
    expect(((await screen.findByLabelText('ai_trace')) as HTMLInputElement).value).toBe('users:6');
    expect(await screen.findByText('{"sections":[]}')).toBeTruthy();
    expect(screen.getAllByText('השומר הוריד').length).toBeGreaterThan(1);   // the row and the filter option
  });

  it('opens a call with what was sent and what came back', async () => {
    api.get.mockResolvedValue({ data: {
      trace: { ...call, request: JSON.stringify({ jsonOutput: true, messages: [{ role: 'system', text: 'אתה מחלץ פריטים' }, { role: 'user', text: 'איטום גג 100 מטר' }] }),
        responseText: '{"sections":[{"title":"איטום"}]}', details: null, conversationId: null },
      related: [{ id: 12, createdAt: call.createdAt, kind: 'guard', promptKey: 'quote_chat_guard', attempt: null, outcome: 'removed', latencyMs: null, costUsd: null }],
    } } as never);
    render(<AiTraces />);
    fireEvent.click(await screen.findByText('{"sections":[]}'));
    expect(await screen.findByText('אתה מחלץ פריטים')).toBeTruthy();
    expect(screen.getByText('איטום גג 100 מטר')).toBeTruthy();
    expect(screen.getByText('{"sections":[{"title":"איטום"}]}')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(11);
  });

  it('shows why the guard removed a description line', async () => {
    api.get.mockResolvedValue({ data: {
      trace: { ...guard, request: null, responseText: null, conversationId: null,
        details: JSON.stringify({ numbers: ['ברז: price 999'], units: 0, descriptions: [{ item: 'ברז', line: 'אחריות Grohe', kept: false, reason: 'brand', saidPct: 0, unsaid: ['Grohe'] }] }) },
      related: [],
    } } as never);
    render(<AiTraces />);
    await screen.findByText('{"sections":[]}');   // the list has loaded
    const rows = screen.getAllByText('השומר');
    fireEvent.click(rows[rows.length - 1]);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(12));
    expect(await screen.findByText('אחריות Grohe')).toBeTruthy();
    expect(screen.getByText('מותג / מילה לועזית שלא נאמרה')).toBeTruthy();
    expect(screen.getByText(/ברז: price 999/)).toBeTruthy();
  });

  it('saves the switch with the retention', async () => {
    api.setSettings.mockResolvedValue({ data: { value: 'on', retentionDays: 3 } } as never);
    render(<AiTraces />);
    fireEvent.change(await screen.findByLabelText('ai_trace'), { target: { value: 'on' } });
    fireEvent.change(screen.getByLabelText('ai_trace_retention_days'), { target: { value: '3' } });
    fireEvent.click(screen.getByText('שמירה'));
    await waitFor(() => expect(api.setSettings).toHaveBeenCalledWith('on', 3));
  });
});
