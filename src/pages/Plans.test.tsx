import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Plans from './Plans';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock('../api/adminApi', async (orig) => ({
  ...(await orig<typeof import('../api/adminApi')>()),
  adminApi: { getPlans: vi.fn(), updatePlan: vi.fn(), createPlan: vi.fn(), deletePlan: vi.fn() },
}));

import { adminApi } from '../api/adminApi';
const api = vi.mocked(adminApi);

describe('Plans: the advisor daily turns (B46)', () => {
  afterEach(cleanup);

  it('shows the plan number and saves a new one', async () => {
    api.getPlans.mockResolvedValue({
      data: [{ id: 3, name: 'מקצועי', code: 'professional', price: 99, currency: 'ILS', billingPeriod: 'month', isActive: true, displayOrder: 1, advisorDailyTurns: 15, createdAt: '', updatedAt: '' }],
    } as never);
    api.updatePlan.mockResolvedValue({ data: {} } as never);
    render(<Plans />);
    fireEvent.click(await screen.findByText('מקצועי'));
    fireEvent.click(await screen.findByText('ערוך'));
    const input = screen.getByLabelText('תורות ליועץ ביום') as HTMLInputElement;
    expect(input.value).toBe('15');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.click(screen.getByText('שמור'));
    await waitFor(() => expect(api.updatePlan).toHaveBeenCalled());
    expect(api.updatePlan.mock.calls[0][1].advisorDailyTurns).toBe(25);
  });
});
