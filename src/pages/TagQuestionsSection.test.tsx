import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TagQuestionsSection from './TagQuestionsSection';

vi.mock('../api/chatTradeQuestionsApi', async (orig) => ({
  ...(await orig<typeof import('../api/chatTradeQuestionsApi')>()),
  tagQuestionsApi: { list: vi.fn(), update: vi.fn() },
}));

import { tagQuestionsApi } from '../api/chatTradeQuestionsApi';
const api = vi.mocked(tagQuestionsApi);

const row = (field: string, sortOrder: number, questionHe: string) => ({
  field, questionHe, required: false, sortOrder, timing: 'after_draft', audience: 'new_client', isActive: true, updatedAt: '', updatedBy: null,
});

describe('TagQuestionsSection (AI-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ data: [row('client_type', 1, 'מה סוג הלקוח של {{name}}?'), row('customer_source', 2, '{{name}} הגיע אליך מ…?')] } as never);
    api.update.mockResolvedValue({ data: {} } as never);
  });
  afterEach(cleanup);

  it('lists the tag questions with when and for whom, and saves a change', async () => {
    render(<TagQuestionsSection />);
    expect(await screen.findByText('מה סוג הלקוח של {{name}}?')).toBeTruthy();
    expect(screen.getAllByText('אחרי שההצעה מוכנה · רק ללקוח חדש · עם דלג')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'עריכה' })[1]);
    fireEvent.change(screen.getByLabelText('מתי נשאלת'), { target: { value: 'before_draft' } });
    fireEvent.change(screen.getByLabelText('למי'), { target: { value: 'all' } });
    fireEvent.click(screen.getByLabelText('חובה'));
    fireEvent.click(screen.getByRole('button', { name: /שמירה/ }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('customer_source',
      { questionHe: '{{name}} הגיע אליך מ…?', required: true, sortOrder: 2, timing: 'before_draft', audience: 'all', isActive: true }));
  });

  it('shows the server message when a value is refused', async () => {
    api.update.mockRejectedValue({ response: { data: { message: 'צריך נוסח לשאלה' } } });
    render(<TagQuestionsSection />);
    await screen.findByText('מה סוג הלקוח של {{name}}?');
    fireEvent.click(screen.getAllByRole('button', { name: 'עריכה' })[0]);
    fireEvent.change(screen.getByLabelText('נוסח השאלה'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /שמירה/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('צריך נוסח לשאלה');
  });
});
