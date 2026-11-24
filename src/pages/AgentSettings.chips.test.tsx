import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentSettings from './AgentSettings';

vi.mock('./CustomStates', () => ({ default: () => null }));
vi.mock('../api/agentSettingsApi', () => ({
  agentSettingsApi: { get: vi.fn(), setSetting: vi.fn(), setText: vi.fn(), setListItem: vi.fn(), addListItem: vi.fn(), removeListItem: vi.fn(), orderList: vi.fn() },
}));

import { agentSettingsApi } from '../api/agentSettingsApi';
const api = vi.mocked(agentSettingsApi);

const item = (itemKey: string, label: string, sortOrder: number) => ({ listKey: 'general_chips.home', itemKey, label, isActive: true, sortOrder });

describe('AgentSettings · Today smart questions (AI-25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ settings: [], texts: [], history: [], lists: [item('open_tasks', 'סכם לי משימות פתוחות', 1), item('unpaid', 'מי לא שילם?', 2)] });
    api.addListItem.mockResolvedValue({} as never);
    api.orderList.mockResolvedValue({} as never);
    api.removeListItem.mockResolvedValue({} as never);
  });
  afterEach(cleanup);

  it('adds a question at the top, moves one up and removes one', async () => {
    render(<AgentSettings />);
    fireEvent.click(await screen.findByText(/טבלאות/));
    expect(screen.getByText('Today smart · שאלות נפוצות · בית')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('מפתח שאלה חדשה general_chips.home'), { target: { value: 'hot' } });
    fireEvent.change(screen.getByLabelText('נוסח שאלה חדשה general_chips.home'), { target: { value: 'מי הכי חם היום?' } });
    fireEvent.click(screen.getAllByLabelText('בראש הרשימה')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /הוסף שאלה/ })[0]);
    await waitFor(() => expect(api.addListItem).toHaveBeenCalledWith('general_chips.home', { itemKey: 'hot', label: 'מי הכי חם היום?', position: 1 }));

    fireEvent.click(screen.getByLabelText('הזז למעלה unpaid'));
    await waitFor(() => expect(api.orderList).toHaveBeenCalledWith('general_chips.home', ['unpaid', 'open_tasks']));
    expect((screen.getByLabelText('הזז למעלה open_tasks') as HTMLButtonElement).disabled).toBe(true);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByLabelText('מחק unpaid'));
    await waitFor(() => expect(api.removeListItem).toHaveBeenCalledWith('general_chips.home', 'unpaid'));
  });
});
