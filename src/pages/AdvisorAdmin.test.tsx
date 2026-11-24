import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdvisorAdmin from './AdvisorAdmin';

vi.mock('../api/advisorAdminApi', async (orig) => ({
  ...(await orig<typeof import('../api/advisorAdminApi')>()),
  advisorAdminApi: {
    cards: vi.fn(), updateCard: vi.fn(), addQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn(), reorder: vi.fn(),
    profileKeys: vi.fn(), saveProfileKey: vi.fn(), professionRules: vi.fn(), saveProfessionRule: vi.fn(), chipMap: vi.fn(), saveChip: vi.fn(),
    principles: vi.fn(), savePrinciple: vi.fn(),
  },
}));

import { advisorAdminApi, type AdminAdvisorCard } from '../api/advisorAdminApi';
const api = vi.mocked(advisorAdminApi);

const card17: AdminAdvisorCard = {
  key: 'adv_17', number: 17, goal: 'more_jobs', icon: 'handshake', title: 'איך תגרום ללקוחות מרוצים להמליץ עליך?', subtitle: 'משפט אחד שמביא הפניות',
  opening: 'לקוח מאוכזב…', kbKeys: [], metrics: [], outputSpec: {}, numbersSpec: null, handoff: { kind: 'referral', label: 'נסח בקשה ל…' },
  sortOrder: 1, isActive: true, updatedAt: '', updatedBy: null,
  questions: [
    { key: 'q1', text: 'אתה מבקש מלקוחות מרוצים להפנות אליך?', source: 'fixed', options: [{ key: 'o1', label: 'תמיד' }, { key: 'o2', label: 'לפעמים' }], profileKey: 'prof_asks_referrals' },
    { key: 'q2', text: 'יש משהו שתוכל להציע בחינם?', source: 'profession', options: [{ key: 'o1', label: 'בדיקה' }], profileKey: 'prof_free_offer' },
  ],
};

describe('AdvisorAdmin (B34)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.cards.mockResolvedValue({ data: [card17] } as never);
    api.updateQuestion.mockImplementation(async (_k, q) => ({ data: { ...card17, questions: [q, card17.questions[1]] } }) as never);
    api.reorder.mockResolvedValue({ data: { ...card17, questions: [card17.questions[1], card17.questions[0]] } } as never);
    api.addQuestion.mockResolvedValue({ data: { ...card17, questions: [...card17.questions, { key: 'q3', text: 'שאלה חדשה', source: 'fixed', options: [] }] } } as never);
  });
  afterEach(cleanup);

  it('lists the cards by goal and edits a question, keeping each button key by its place', async () => {
    render(<AdvisorAdmin />);
    fireEvent.click(await screen.findByText('עריכה'));
    fireEvent.change(screen.getByLabelText('טקסט q1'), { target: { value: 'כמה פעמים אתה מבקש?' } });
    fireEvent.change(screen.getByLabelText('כפתורים q1'), { target: { value: 'תמיד\nלפעמים\nאף פעם' } });
    fireEvent.click(screen.getAllByText('שמור שאלה')[0]);
    await waitFor(() => expect(api.updateQuestion).toHaveBeenCalled());
    const [key, q] = api.updateQuestion.mock.calls[0];
    expect(key).toBe('adv_17');
    expect(q.text).toBe('כמה פעמים אתה מבקש?');
    expect(q.options).toEqual([{ key: 'o1', label: 'תמיד' }, { key: 'o2', label: 'לפעמים' }, { key: '', label: 'אף פעם' }]);
  });

  it('adds a question and moves one', async () => {
    render(<AdvisorAdmin />);
    fireEvent.click(await screen.findByText('עריכה'));
    fireEvent.click(screen.getByLabelText('למטה q1'));
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith('adv_17', ['q2', 'q1']));
    fireEvent.click(screen.getByText('הוסף שאלה'));
    await waitFor(() => expect(api.addQuestion).toHaveBeenCalled());
    expect(await screen.findByLabelText('שאלה q3')).toBeTruthy();
  });

  it('shows the server error code in words', async () => {
    api.updateQuestion.mockRejectedValue({ response: { data: { error: 'ADVISOR_PROFILE_KEY_UNKNOWN' } } });
    render(<AdvisorAdmin />);
    fireEvent.click(await screen.findByText('עריכה'));
    fireEvent.click(screen.getAllByText('שמור שאלה')[0]);
    expect((await screen.findByRole('alert')).textContent).toContain('שדה הפרופיל לא קיים');
  });
});
