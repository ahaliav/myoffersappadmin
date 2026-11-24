import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModelSelect, { resetModelChoices } from './ModelSelect';

vi.mock('../api/aiSettingsApi', async (orig) => ({
  ...(await orig<typeof import('../api/aiSettingsApi')>()),
  aiSettingsApi: { get: vi.fn() },
}));
import { aiSettingsApi } from '../api/aiSettingsApi';

const model = (providerKey: string, modelKey: string, displayName: string, over: object = {}) => ({
  id: 0, providerKey, modelKey, displayName, enabled: true, capabilities: ['text'], maxInputTokens: null, maxOutputTokens: null,
  inputPricePerMTok: null, outputPricePerMTok: null, cachedInputPricePerMTok: null, effort: null, notes: null, source: 'seed',
  lastTestAt: null, lastTestSuccess: null, ...over,
});

describe('ModelSelect (AI-13)', () => {
  beforeEach(() => {
    resetModelChoices();
    vi.mocked(aiSettingsApi.get).mockResolvedValue({
      data: {
        providers: [
          { key: 'openai', name: 'OpenAI', enabled: true, timeoutSeconds: 60, credentialsConfigured: true, credentialsSource: '' },
          { key: 'anthropic', name: 'Anthropic', enabled: false, timeoutSeconds: 60, credentialsConfigured: false, credentialsSource: '' },
        ],
        models: [
          model('openai', 'gpt-4o', 'GPT-4o'),
          model('anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5'),
          model('anthropic', 'claude-haiku-5-5', 'Claude Haiku 5.5', { enabled: false }),
          model('openai', 'gpt-image-1-mini', 'Image', { capabilities: ['image_generation'] }),
        ],
      },
    } as never);
  });
  afterEach(cleanup);

  it('lists Claude next to OpenAI, marks a provider that is off, and keeps an unknown current value', async () => {
    const onChange = vi.fn();
    render(<ModelSelect value="legacy-model" onChange={onChange} emptyLabel="ברירת מחדל" ariaLabel="מודל" />);
    await waitFor(() => expect(screen.getByText(/Claude Sonnet 5.5/)).toBeTruthy());
    expect(screen.getByText('Claude Sonnet 5.5 (claude-sonnet-5-5) · הספק כבוי')).toBeTruthy();
    expect(screen.getByText('GPT-4o (gpt-4o)')).toBeTruthy();
    expect(screen.queryByText(/Claude Haiku/)).toBeNull(); // a disabled model is not offered
    expect(screen.queryByText(/Image/)).toBeNull(); // not a text model
    expect(screen.getByText('legacy-model (לא ברשימה)')).toBeTruthy();
    expect(document.querySelectorAll('optgroup')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('מודל'), { target: { value: 'claude-sonnet-5-5' } });
    expect(onChange).toHaveBeenCalledWith('claude-sonnet-5-5');
  });
});
