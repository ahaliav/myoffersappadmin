import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../api/axiosClient', () => ({ default: { get: vi.fn() } }));

import axiosClient from '../api/axiosClient';
import AiUsageReportCard from './AiUsageReportCard';

const get = vi.mocked(axiosClient.get);

describe('AiUsageReportCard', () => {
  afterEach(cleanup);

  it('shows calls, failure rate, latency, cost and recent failures by request id', async () => {
    get.mockResolvedValue({
      data: {
        days: 7, calls: 3, failed: 1, estimatedCost: 6,
        features: [{ operation: 'write_quote_title', promptKey: 'write_quote_title', calls: 3, failed: 1, p50Ms: 200, p95Ms: 290,
          inputTokens: 2000000, outputTokens: 200000, estimatedCost: 6, errors: { Timeout: 1 } }],
        recentFailures: [{ at: '2026-10-23T10:00:00Z', userId: 5, operation: 'write_quote_title', promptKey: 'write_quote_title',
          errorKind: 'Timeout', provider: 'anthropic', model: 'claude-sonnet-5-5', correlationId: 'req-3' }],
      },
    });

    render(<AiUsageReportCard />);

    expect((await screen.findAllByText('33.3%', { exact: false })).length).toBe(2); // total and per feature
    expect(screen.getByText('200 ms')).toBeTruthy();
    expect(screen.getByText('290 ms')).toBeTruthy();
    expect(screen.getAllByText('$6.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Timeout 1')).toBeTruthy();
    expect(screen.getByText('req-3')).toBeTruthy();
  });

  it('asks for another time range and shows a clear error when the report fails', async () => {
    get.mockRejectedValueOnce({ response: { status: 500, data: { message: 'boom' } } });
    render(<AiUsageReportCard />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'boom');

    get.mockResolvedValueOnce({ data: { days: 30, calls: 0, failed: 0, estimatedCost: null, features: [], recentFailures: [] } });
    fireEvent.change(screen.getByLabelText('טווח ימים'), { target: { value: '30' } });
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/api/admin/ai-usage-report', { params: { days: 30 } }));
    expect(await screen.findByText('אין קריאות AI בטווח הזה.')).toBeTruthy();
  });
});
