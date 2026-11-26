import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../api/axiosClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import axiosClient from '../api/axiosClient';
import AiEvalCard, { RouterEvalCard } from './AiEvalCard';

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);

// AI-25 (live 25.11): the full router set (97 sentences) ran in one request and failed after ~100 seconds (the server's
// wait); with {ids:[…]} of 8 it worked. The card now runs the set in small batches, one after another, and merges them.
describe('the eval cards run in batches', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    post.mockReset();
  });
  afterEach(cleanup);

  it('the router set goes in batches of 10 and the summary counts all of them', async () => {
    const cases = Array.from({ length: 23 }, (_, i) => ({ id: `c-${i}`, text: `משפט ${i}`, intents: ['customer'] }));
    get.mockResolvedValue({ data: cases });
    post.mockImplementation(async (_url: string, body?: unknown) => {
      const ids = (body as { ids: string[] }).ids;
      return { data: { ranAt: '', total: ids.length, passed: ids.length - (ids.includes('c-5') ? 1 : 0), percent: 0,
        results: ids.map((id) => ({ id, text: id, passed: id !== 'c-5', failures: id === 'c-5' ? ['intent x'] : [], got: 'x', latencyMs: 1 })) } };
    });

    render(<RouterEvalCard />);
    fireEvent.click(await screen.findByRole('button', { name: /הרץ/ }));

    await waitFor(() => expect(screen.getByText(/עברו 22 מתוך 23/)).toBeTruthy());
    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls.map((c) => (c[1] as { ids: string[] }).ids.length)).toEqual([10, 10, 3]);
    expect(post.mock.calls[0][0]).toBe('/api/admin/ai-eval/router-run');
    expect(screen.getAllByText('c-5').length).toBeGreaterThan(0); // the failed one is listed
  });

  it('the quality set goes in batches too', async () => {
    const cases = Array.from({ length: 7 }, (_, i) => ({ id: `q-${i}`, description: 'd', feature: 'f' }));
    get.mockResolvedValue({ data: cases });
    post.mockImplementation(async (_url: string, body?: unknown) => {
      const ids = (body as { ids: string[] }).ids;
      return { data: { ranAt: '', total: ids.length, passed: ids.length,
        results: ids.map((id) => ({ id, description: 'd', passed: true, status: 'ok', failures: [], latencyMs: 1, provider: null, model: null })) } };
    });

    render(<AiEvalCard />);
    fireEvent.click(await screen.findByRole('button', { name: /הרץ את כל הבדיקות/ }));

    await waitFor(() => expect(screen.getByText(/עברו 7 מתוך 7/)).toBeTruthy());
    expect(post.mock.calls.map((c) => (c[1] as { ids: string[] }).ids.length)).toEqual([5, 2]);
  });
});
