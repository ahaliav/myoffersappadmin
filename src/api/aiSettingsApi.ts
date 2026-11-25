import axiosClient from './axiosClient';

/**
 * Admin "AI Settings" API (backend: /api/admin/ai-settings). Responses never contain API keys: a key can be sent
 * (saveApiKey), but only its last 4 characters ever come back.
 */

export interface AiOperationOverride {
  operation: string;
  modelId: number;
  fallbackModelId: number | null;
}

export interface AiActiveConfiguration {
  version: number;
  defaultModelId: number;
  defaultFallbackModelId: number | null;
  overrides: AiOperationOverride[];
  notes: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AiProvider {
  key: string;
  name: string;
  enabled: boolean;
  timeoutSeconds: number;
  /** Whether the server has an API key for this provider. The key itself is never sent. */
  credentialsConfigured: boolean;
  /** Config key / environment variable names that hold the key (names only). */
  credentialsSource: string;
  /** A key can be saved for this provider from this screen. */
  keyManageable?: boolean;
  /** Where the key in use comes from: saved here ("database"), server config, server environment, or none. */
  keySource?: 'database' | 'config' | 'environment' | 'none';
  /** The server itself has a key (.env / environment): deleting the saved key falls back to it. */
  serverKeyConfigured?: boolean;
  /** A key was saved from this screen (the key itself is never sent). */
  storedKeyConfigured?: boolean;
  /** False when the saved key can't be decrypted anymore (enter it again). */
  storedKeyReadable?: boolean;
  storedKeyLast4?: string | null;
  storedKeyUpdatedAt?: string | null;
  storedKeyUpdatedBy?: string | null;
  implemented: boolean;
  supportedCapabilities: string[];
  updatedAt: string;
}

export interface AiModel {
  id: number;
  providerKey: string;
  modelKey: string;
  displayName: string;
  enabled: boolean;
  capabilities: string[];
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
  cachedInputPricePerMTok: number | null;
  effort: string | null;
  notes: string | null;
  source: string;
  lastTestAt: string | null;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
  lastSuccessfulTestAt: string | null;
  usedBy: string[];
  updatedAt: string;
}

export interface AiOperationStatus {
  key: string;
  displayName: string;
  displayNameHe: string;
  requiredCapabilities: string[];
  inUse: boolean;
  usedBy: string;
  modelId: number;
  fallbackModelId: number | null;
  isOverride: boolean;
  problem: string | null;
}

export interface AiPromptModelOverride {
  promptKey: string;
  promptName: string;
  model: string;
  honored: boolean;
  reason: string | null;
}

export interface AiSettingsOverview {
  activeConfiguration: AiActiveConfiguration;
  providers: AiProvider[];
  models: AiModel[];
  operations: AiOperationStatus[];
  promptModelOverrides: AiPromptModelOverride[];
  capabilityKeys: string[];
  health: { healthy: boolean; problems: string[]; storeError: string | null };
}

export interface AiActivateRequest {
  expectedVersion: number;
  defaultModelId: number;
  defaultFallbackModelId: number | null;
  overrides: AiOperationOverride[];
  notes?: string;
}

export interface AiModelUpsert {
  providerKey?: string;
  modelKey?: string;
  displayName: string;
  enabled: boolean;
  capabilities: string[];
  maxInputTokens?: number | null;
  maxOutputTokens?: number | null;
  inputPricePerMTok?: number | null;
  outputPricePerMTok?: number | null;
  cachedInputPricePerMTok?: number | null;
  effort?: string | null;
  notes?: string | null;
  fromDiscovery?: boolean;
}

export interface AiTestResult {
  success: boolean;
  message: string;
  providerKey: string;
  modelKey: string;
  elapsedMs: number;
  testedAt: string;
}

export interface AiDiscoveredModel {
  modelKey: string;
  displayName: string | null;
  inCatalog: boolean;
}

export interface AiAuditEntry {
  id: number;
  createdAt: string;
  userEmail: string | null;
  action: string;
  success: boolean;
  previousValue: string | null;
  newValue: string | null;
  message: string | null;
}

const base = '/api/admin/ai-settings';

export const aiSettingsApi = {
  get: () => axiosClient.get<AiSettingsOverview>(base),
  activate: (body: AiActivateRequest) => axiosClient.put<AiSettingsOverview>(`${base}/active`, body),
  updateProvider: (key: string, body: { enabled?: boolean; timeoutSeconds?: number }) =>
    axiosClient.put<AiProvider>(`${base}/providers/${encodeURIComponent(key)}`, body),
  createModel: (body: AiModelUpsert) => axiosClient.post<AiModel>(`${base}/models`, body),
  updateModel: (id: number, body: AiModelUpsert) => axiosClient.put<AiModel>(`${base}/models/${id}`, body),
  test: (modelId: number) => axiosClient.post<AiTestResult>(`${base}/test`, { modelId }),
  /** Save or replace the provider's API key. The server encrypts it and returns the overview, never the key. */
  saveApiKey: (providerKey: string, apiKey: string) =>
    axiosClient.put<AiSettingsOverview>(`${base}/providers/${encodeURIComponent(providerKey)}/api-key`, { apiKey }),
  /** Delete the saved key: the provider goes back to the server key, if there is one. */
  deleteApiKey: (providerKey: string) =>
    axiosClient.delete<AiSettingsOverview>(`${base}/providers/${encodeURIComponent(providerKey)}/api-key`),
  discover: (providerKey: string) =>
    axiosClient.post<AiDiscoveredModel[]>(`${base}/providers/${encodeURIComponent(providerKey)}/discover`),
  audit: (limit = 50) => axiosClient.get<AiAuditEntry[]>(`${base}/audit`, { params: { limit } }),
};

/** Turns an API error into a message for the screen (server validation messages are shown as-is). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { message?: string; errors?: string[] } } };
  const status = e?.response?.status;
  if (status === 403) return 'אין לך הרשאת מנהל למסך הזה.';
  if (status === 429 || status === 503) return 'יותר מדי בקשות. נסו שוב בעוד דקה.';
  const errors = e?.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.join('\n');
  return e?.response?.data?.message || fallback;
}
