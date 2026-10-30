import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CustomStates from './CustomStates';
import type { CustomStatesData } from '../api/customStatesApi';

vi.mock('../api/customStatesApi', () => ({
  customStatesApi: { get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), preview: vi.fn() },
}));

import { customStatesApi } from '../api/customStatesApi';
const api = vi.mocked(customStatesApi);

const data: CustomStatesData = {
  states: [{
    id: 1, key: 'fb_photos', name: 'פייסבוק בלי הצעה', line: 'כדאי לבקש מ{{name}} תמונות.',
    conditions: [{ field: 'customer_source', op: 'eq', value: 'פייסבוק' }, { field: 'quotes_count', op: 'eq', value: '0' }],
    dot: 'yes', urgency: 1, isActive: true,
    recipe: { label: 'בקשת תמונות', steps: [{ type: 'message', topic: 'בקשת תמונות' }, { type: 'reminder', days: 2 }] },
    createdAt: '2026-10-30T08:00:00Z', updatedAt: '2026-10-30T08:00:00Z', updatedBy: 'admin@x.com',
  }],
  fields: [
    { key: 'customer_source', label: 'מקור הלקוח', type: 'text', unit: null, ops: ['eq', 'ne', 'contains'] },
    { key: 'quotes_count', label: 'מספר הצעות', type: 'number', unit: 'הצעות', ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
    { key: 'has_open_complaint', label: 'יש תלונה פתוחה', type: 'bool', unit: null, ops: ['eq'] },
  ],
  ops: { eq: '=', ne: '≠', contains: 'מכיל', gt: '>', gte: '≥', lt: '<', lte: '≤' },
  builtIns: [{ order: 1, key: 'complaint_open', name: 'תלונה פתוחה' }, { order: 2, key: 'new_lead', name: 'ליד חדש' }],
  stepTypes: ['message', 'prep_call', 'consult', 'reminder'],
  history: [{ id: 5, stateId: 1, key: 'fb_photos', action: 'create', snapshot: {}, changedAt: '2026-10-30T08:00:00Z', changedBy: 'admin@x.com' }],
};

describe('CustomStates (E12 state builder)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(data);
  });
  afterEach(cleanup);

  it('lists a state with its conditions, place, dot and recipe', async () => {
    render(<CustomStates />);
    expect(await screen.findByText('פייסבוק בלי הצעה')).toBeTruthy();
    expect(screen.getByText('מקור הלקוח = פייסבוק')).toBeTruthy();
    expect(screen.getByText('מספר הצעות = 0 הצעות')).toBeTruthy();
    expect(screen.getByText(/דחיפות: אחרי "תלונה פתוחה"/)).toBeTruthy();
    expect(screen.getByText(/כפתור: "בקשת תמונות" \(ניסוח הודעה ללקוח: בקשת תמונות \+ תזכורת בעוד 2 ימים\)/)).toBeTruthy();
  });

  it("shows the server's Hebrew reasons when a state can't be saved", async () => {
    api.create.mockRejectedValue({ response: { data: { message: 'x', errors: ['תנאי 1: בשדה "מספר הצעות" צריך מספר, והתקבל "אפס".', 'חסר שם למצב.'] } } });
    render(<CustomStates />);
    fireEvent.click(await screen.findByText('מצב חדש'));
    fireEvent.change(screen.getByLabelText('שדה 1'), { target: { value: 'quotes_count' } });
    fireEvent.change(screen.getByLabelText('ערך 1'), { target: { value: 'אפס' } });
    fireEvent.click(screen.getByText('שמירה'));
    expect(await screen.findByText('תנאי 1: בשדה "מספר הצעות" צריך מספר, והתקבל "אפס".')).toBeTruthy();
    expect(screen.getByText('חסר שם למצב.')).toBeTruthy();
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ conditions: [{ field: 'quotes_count', op: 'eq', value: 'אפס' }], recipe: null }));
  });

  it('builds the Facebook state with a recipe, saves it and says how many customers it fits', async () => {
    api.create.mockResolvedValue(data.states[0]);
    api.preview.mockResolvedValue({ count: 3, text: 'מתאים עכשיו ל-3 לקוחות' });
    render(<CustomStates />);
    fireEvent.click(await screen.findByText('מצב חדש'));
    fireEvent.change(screen.getByLabelText('שם המצב'), { target: { value: 'פייסבוק בלי הצעה' } });
    fireEvent.change(screen.getByLabelText('מפתח (אנגלית)'), { target: { value: 'fb_new' } });
    fireEvent.change(screen.getByLabelText(/מה הסוכן אומר/), { target: { value: 'כדאי לבקש מ{{name}} תמונות.' } });
    fireEvent.change(screen.getByLabelText('ערך 1'), { target: { value: 'פייסבוק' } });
    fireEvent.click(screen.getByText('תנאי'));
    fireEvent.change(screen.getByLabelText('ערך 2'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('דחיפות (מקום בין המצבים)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/מתכון: שם הכפתור/), { target: { value: 'בקשת תמונות' } });
    fireEvent.click(screen.getByText('צעד'));
    fireEvent.change(screen.getByLabelText('נושא 1'), { target: { value: 'בקשת תמונות' } });

    fireEvent.click(screen.getByText('כמה לקוחות מתאימים?'));
    expect(await screen.findByText('מתאים עכשיו ל-3 לקוחות')).toBeTruthy();

    fireEvent.click(screen.getByText('שמירה'));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({
      key: 'fb_new', name: 'פייסבוק בלי הצעה', line: 'כדאי לבקש מ{{name}} תמונות.', dot: 'yes', urgency: 1, isActive: true,
      conditions: [{ field: 'customer_source', op: 'eq', value: 'פייסבוק' }, { field: 'quotes_count', op: 'eq', value: '0' }],
      recipe: { label: 'בקשת תמונות', steps: [{ type: 'message', topic: 'בקשת תמונות' }] },
    }));
    expect(await screen.findByText('נשמר. מתאים עכשיו ל-3 לקוחות')).toBeTruthy();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('switches a state off without deleting it, and shows its history', async () => {
    api.update.mockResolvedValue({ ...data.states[0], isActive: false });
    render(<CustomStates />);
    fireEvent.click(await screen.findByLabelText('פעיל פייסבוק בלי הצעה'));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(1, expect.objectContaining({ key: 'fb_photos', isActive: false })));
    expect(api.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('היסטוריה'));
    expect(screen.getByText(/נוצר · .* · admin@x.com/)).toBeTruthy();
  });
});
