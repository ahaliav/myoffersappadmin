import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatTradeQuestions from './ChatTradeQuestions';

vi.mock('../api/chatTradeQuestionsApi', () => ({
  chatTradeQuestionsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
  quoteChatSettingsApi: { get: vi.fn(), set: vi.fn() },
}));

import { chatTradeQuestionsApi, quoteChatSettingsApi } from '../api/chatTradeQuestionsApi';
const api = vi.mocked(chatTradeQuestionsApi);
const settings = vi.mocked(quoteChatSettingsApi);

const rooms = {
  id: 1, trade: '*', itemKeyword: 'צביעת|צביעה', detailKey: 'rooms', questionHe: '{{item}}: כמה חדרים?',
  optionsSource: 'fixed:1-2 חדרים|3 חדרים|לא רלוונטי', required: true, sortOrder: 1, isActive: true, updatedAt: '', updatedBy: null,
};

describe('ChatTradeQuestions (O13 admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ data: [rooms] } as never);
    settings.get.mockResolvedValue({ data: { settings: [
      { key: 'qc_enabled', value: 'off', description: null, updatedAt: null, updatedBy: null },
      { key: 'qc_photos', value: 'off', description: null, updatedAt: null, updatedBy: null },
    ], history: [] } } as never);
  });
  afterEach(cleanup);

  it('lists the questions with what they apply to', async () => {
    render(<ChatTradeQuestions />);
    expect(await screen.findByText('{{item}}: כמה חדרים?')).toBeTruthy();
    expect(screen.getByText(/כל המקצועות/)).toBeTruthy();
  });

  it("shows the server's reason when a question can't be saved", async () => {
    api.create.mockRejectedValue({ response: { data: { message: 'detail_key: lowercase letters, digits and _' } } });
    render(<ChatTradeQuestions />);
    fireEvent.click(await screen.findByText('שאלה חדשה'));
    const saves = screen.getAllByText('שמירה');
    fireEvent.click(saves[saves.length - 1]); // the new question's form (the switches have their own)
    expect(await screen.findByText('detail_key: lowercase letters, digits and _')).toBeTruthy();
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('turns a question off without deleting it', async () => {
    api.deactivate.mockResolvedValue({} as never);
    render(<ChatTradeQuestions />);
    fireEvent.click(await screen.findByText('כיבוי'));
    await waitFor(() => expect(api.deactivate).toHaveBeenCalledWith(1));
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('switches the chat on for a pilot without a deploy', async () => {
    settings.set.mockResolvedValue({} as never);
    render(<ChatTradeQuestions />);
    const input = await screen.findByLabelText('qc_enabled');
    fireEvent.change(input, { target: { value: 'users:12,34' } });
    fireEvent.click(screen.getAllByText('שמירה')[0]);
    await waitFor(() => expect(settings.set).toHaveBeenCalledWith('qc_enabled', 'users:12,34'));
  });
});
