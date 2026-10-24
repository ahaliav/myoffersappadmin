import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatTradeQuestions from './ChatTradeQuestions';

vi.mock('../api/chatTradeQuestionsApi', () => ({
  chatTradeQuestionsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
}));

import { chatTradeQuestionsApi } from '../api/chatTradeQuestionsApi';
const api = vi.mocked(chatTradeQuestionsApi);

const rooms = {
  id: 1, trade: '*', itemKeyword: 'צביעת|צביעה', detailKey: 'rooms', questionHe: '{{item}}: כמה חדרים?',
  optionsSource: 'fixed:1-2 חדרים|3 חדרים|לא רלוונטי', required: true, sortOrder: 1, isActive: true, updatedAt: '', updatedBy: null,
};

describe('ChatTradeQuestions (O13 admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ data: [rooms] } as never);
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
    fireEvent.click(screen.getByText('שמירה'));
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
});
