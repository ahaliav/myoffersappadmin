import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AiSettings from './AiSettings';
import type { AiSettingsOverview } from '../api/aiSettingsApi';

vi.mock('../api/aiSettingsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/aiSettingsApi')>();
  return {
    ...actual,
    aiSettingsApi: {
      get: vi.fn(),
      activate: vi.fn(),
      updateProvider: vi.fn(),
      createModel: vi.fn(),
      updateModel: vi.fn(),
      test: vi.fn(),
      discover: vi.fn(),
      audit: vi.fn(),
    },
  };
});

import { aiSettingsApi } from '../api/aiSettingsApi';
const api = vi.mocked(aiSettingsApi);

const TEXT = ['text', 'streaming', 'json_output', 'tool_calling', 'image_input', 'document_input'];
const OPENAI_CAPS = [...TEXT, 'audio_transcription'];

function model(id: number, providerKey: string, modelKey: string, displayName: string, capabilities = TEXT, extra: Partial<AiSettingsOverview['models'][number]> = {}) {
  return {
    id, providerKey, modelKey, displayName, enabled: true, capabilities,
    maxInputTokens: null, maxOutputTokens: null, inputPricePerMTok: null, outputPricePerMTok: null, cachedInputPricePerMTok: null,
    effort: null, notes: null, source: 'seed', lastTestAt: null, lastTestSuccess: null, lastTestMessage: null,
    lastSuccessfulTestAt: null, usedBy: [], updatedAt: '2026-10-23T08:00:00Z', ...extra,
  };
}

function overview(version = 1, defaultModelId = 1): AiSettingsOverview {
  return {
    activeConfiguration: {
      version, defaultModelId, defaultFallbackModelId: null,
      overrides: [
        { operation: 'extraction', modelId: 2, fallbackModelId: null },
        { operation: 'transcription', modelId: 3, fallbackModelId: null },
      ],
      notes: null, updatedAt: '2026-10-23T08:00:00Z', updatedBy: 'migration:V12',
    },
    providers: [
      { key: 'openai', name: 'OpenAI', enabled: true, timeoutSeconds: 60, credentialsConfigured: true, credentialsSource: 'OpenAI:ApiKey / OPENAI_API_KEY', implemented: true, supportedCapabilities: OPENAI_CAPS, updatedAt: '' },
      { key: 'anthropic', name: 'Anthropic Claude', enabled: true, timeoutSeconds: 60, credentialsConfigured: true, credentialsSource: 'Anthropic:ApiKey / ANTHROPIC_API_KEY', implemented: true, supportedCapabilities: TEXT, updatedAt: '' },
    ],
    models: [
      model(1, 'openai', 'gpt-4o-mini', 'GPT-4o mini', TEXT, { usedBy: ['default'], lastSuccessfulTestAt: '2026-10-22T10:00:00Z' }),
      model(2, 'openai', 'gpt-4o', 'GPT-4o', TEXT, { usedBy: ['extraction'] }),
      model(3, 'openai', 'whisper-1', 'Whisper', ['audio_transcription'], { usedBy: ['transcription'] }),
      model(4, 'anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5'),
    ],
    operations: [
      { key: 'chat', displayName: 'Chat', displayNameHe: "צ'אט", requiredCapabilities: ['text', 'streaming', 'tool_calling'], inUse: true, usedBy: 'General chat', modelId: defaultModelId, fallbackModelId: null, isOverride: false, problem: null },
      { key: 'transcription', displayName: 'Speech to text', displayNameHe: 'תמלול', requiredCapabilities: ['audio_transcription'], inUse: true, usedBy: 'Mic buttons', modelId: 3, fallbackModelId: null, isOverride: true, problem: null },
    ],
    promptModelOverrides: [],
    capabilityKeys: [...TEXT, 'image_generation', 'audio_transcription'],
    health: { healthy: true, problems: [], storeError: null },
  };
}

const ok = <T,>(data: T) => Promise.resolve({ data } as never);
const httpError = (status: number, data: unknown = {}) => Promise.reject({ response: { status, data } });

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(() => ok(overview()));
  api.audit.mockImplementation(() => ok([]));
});

afterEach(() => cleanup());

describe('AiSettings', () => {
  it('shows the active provider, model, version and who changed it', async () => {
    render(<AiSettings />);
    expect((screen.getByRole('status')).textContent).toContain('טוען');

    const summary = await screen.findByRole('region', { name: 'סיכום' });
    expect(within(summary).getByText('OpenAI')).toBeTruthy();
    expect(within(summary).getByText('gpt-4o-mini')).toBeTruthy();
    expect(within(summary).getByText('migration:V12')).toBeTruthy();
    expect(within(summary).getByText('תקין')).toBeTruthy();
  });

  it('tells a non-admin they have no access', async () => {
    api.get.mockImplementation(() => httpError(403));
    render(<AiSettings />);

    expect((await screen.findByRole('alert')).textContent).toContain('אין לך הרשאת מנהל');
    expect(screen.queryByRole('button', { name: /שמירה והפעלה/ })).toBeNull();
  });

  it('shows a load failure and recovers on retry', async () => {
    api.get.mockImplementationOnce(() => httpError(500, { message: 'boom' }));
    render(<AiSettings />);

    expect((await screen.findByRole('alert')).textContent).toContain('boom');
    fireEvent.click(screen.getByRole('button', { name: /נסו שוב/ }));
    expect(await screen.findByRole('region', { name: 'סיכום' })).toBeTruthy();
  });

  it('keeps save disabled until something changes, and cancel restores the draft', async () => {
    render(<AiSettings />);
    const select = await screen.findByLabelText('מודל ברירת מחדל') as HTMLSelectElement;
    const save = screen.getByRole('button', { name: /שמירה והפעלה/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(select, { target: { value: '4' } });
    expect(save.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /ביטול/ }));
    expect(select.value).toBe('1');
    expect(save.disabled).toBe(true);
  });

  it('warns when a selected model lacks a capability the operation needs', async () => {
    render(<AiSettings />);
    const transcription = await screen.findByLabelText('מודל עבור תמלול');

    fireEvent.change(transcription, { target: { value: '4' } });

    expect(await screen.findByText(/הטיוטה לא תעבור את בדיקת השרת/)).toBeTruthy();
    expect(screen.getAllByText(/חסר: תמלול/).length).toBeGreaterThan(0);
  });

  it('an image model chosen ahead of time does not block saving while no feature makes images', async () => {
    const o = overview();
    o.models.push(model(9, 'openai', 'gpt-image-2.5-flare', 'GPT Image 2.5 Flare', ['image_generation', 'image_input']));
    o.operations.push({ key: 'image_generation', displayName: 'Image generation', displayNameHe: 'יצירת תמונות', requiredCapabilities: ['image_generation'], inUse: false, usedBy: '', modelId: 1, fallbackModelId: null, isOverride: false, problem: null });
    api.get.mockImplementation(() => ok(o));
    render(<AiSettings />);

    fireEvent.change(await screen.findByLabelText('מודל עבור יצירת תמונות'), { target: { value: '9' } });

    // OpenAI's client here doesn't list image_generation: the row says so, the draft can still be saved.
    expect((await screen.findAllByText(/חסר: /)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/הטיוטה לא תעבור את בדיקת השרת/)).toBeNull();
  });

  it('asks for confirmation, then activates with the edited version and shows the new version', async () => {
    api.activate.mockImplementation(() => ok(overview(2, 4)));
    render(<AiSettings />);
    fireEvent.change(await screen.findByLabelText('מודל ברירת מחדל'), { target: { value: '4' } });

    fireEvent.click(screen.getByRole('button', { name: /שמירה והפעלה/ }));
    const dialog = await screen.findByRole('dialog', { name: 'אישור הפעלה' });
    expect((dialog).textContent).toContain('Claude Sonnet 5.5');
    expect(api.activate).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'הפעלה' }));

    await waitFor(() => expect(api.activate).toHaveBeenCalledTimes(1));
    const sent = api.activate.mock.calls[0][0];
    expect(sent.expectedVersion).toBe(1);
    expect(sent.defaultModelId).toBe(4);
    expect(sent.defaultFallbackModelId).toBeNull();
    // Existing overrides are kept; operations left on "same as default" are not sent.
    expect([...sent.overrides].sort((a, b) => a.operation.localeCompare(b.operation))).toEqual([
      { operation: 'extraction', modelId: 2, fallbackModelId: null },
      { operation: 'transcription', modelId: 3, fallbackModelId: null },
    ]);
    expect(await screen.findByText(/גרסה 2 הופעלה/)).toBeTruthy();
  });

  it('shows server validation errors without changing anything', async () => {
    api.activate.mockImplementation(() => httpError(400, { errors: ["'claude-sonnet-5-5' is new to the configuration: run Test connection for it first"] }));
    render(<AiSettings />);
    fireEvent.change(await screen.findByLabelText('מודל ברירת מחדל'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /שמירה והפעלה/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'הפעלה' }));

    expect(await screen.findByText(/run Test connection/)).toBeTruthy();
    expect((screen.getByLabelText('מודל ברירת מחדל') as HTMLSelectElement).value).toBe('4');
  });

  it('offers a reload when someone else changed the configuration', async () => {
    api.activate.mockImplementation(() => httpError(409, { message: 'The configuration changed while you were editing' }));
    render(<AiSettings />);
    fireEvent.change(await screen.findByLabelText('מודל ברירת מחדל'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /שמירה והפעלה/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'הפעלה' }));

    fireEvent.click(await screen.findByRole('button', { name: 'טעינה מחדש' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('runs a connection test and shows the result without activating anything', async () => {
    api.test.mockImplementation(() => ok({ success: false, message: 'Authentication failed (check the API key)', providerKey: 'anthropic', modelKey: 'claude-sonnet-5-5', elapsedMs: 120, testedAt: '' }));
    render(<AiSettings />);

    fireEvent.click(await screen.findByRole('button', { name: 'בדיקת חיבור claude-sonnet-5-5' }));

    expect(await screen.findByText(/Authentication failed/)).toBeTruthy();
    expect(api.test).toHaveBeenCalledWith(4);
    expect(api.activate).not.toHaveBeenCalled();
  });

  it('switches a provider on and off through the API', async () => {
    api.updateProvider.mockImplementation(() => ok({}));
    render(<AiSettings />);

    fireEvent.click(await screen.findByLabelText('ספק Anthropic Claude פעיל'));

    await waitFor(() => expect(api.updateProvider).toHaveBeenCalledWith('anthropic', { enabled: false }));
  });

  it('shows only whether a key is configured, never a key', async () => {
    const data = overview();
    data.providers[1].credentialsConfigured = false;
    api.get.mockImplementation(() => ok(data));
    render(<AiSettings />);

    const providers = await screen.findByRole('region', { name: 'ספקים' });
    expect(within(providers).getByText('Anthropic:ApiKey / ANTHROPIC_API_KEY')).toBeTruthy();
    expect(providers.textContent).not.toMatch(/sk-/);
  });
});
