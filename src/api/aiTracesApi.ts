import axiosClient from './axiosClient';

/**
 * B1 "מה קרה בקריאה" (backend: /api/admin/ai-traces): what each AI call sent and got back, and what the quote chat
 * guard removed, kept only while tracing is on (ai_trace = off | on | users:<id>,<id>) and for a few days.
 */
export interface AiTraceRow {
  id: number;
  createdAt: string;
  kind: 'call' | 'guard';
  userId: number | null;
  operation: string | null;
  promptKey: string | null;
  mode: string | null;
  subject: string | null;
  correlationId: string | null;
  provider: string | null;
  model: string | null;
  viaFallback: boolean;
  attempt: number | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costUsd: number | null;
  latencyMs: number | null;
  outcome: string;
  errorMessage: string | null;
  responsePreview?: string | null;
}

export interface AiTraceFull extends AiTraceRow {
  request: string | null;
  responseText: string | null;
  details: string | null;
  conversationId: string | null;
}

export interface AiTraceList {
  total: number;
  page: number;
  pageSize: number;
  rows: AiTraceRow[];
  promptKeys: string[];
}

export interface AiTraceRelated {
  id: number;
  createdAt: string;
  kind: string;
  promptKey: string | null;
  attempt: number | null;
  outcome: string;
  latencyMs: number | null;
  costUsd: number | null;
}

export interface AiTraceSettings {
  value: string;
  retentionDays: number;
  updatedAt: string | null;
  updatedBy: string | null;
  count: number;
  oldest: string | null;
}

export interface AiTraceFilters {
  userId?: number;
  promptKey?: string;
  kind?: string;
  outcome?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const aiTracesApi = {
  list: (filters: AiTraceFilters) => axiosClient.get<AiTraceList>('/api/admin/ai-traces', { params: filters }),
  get: (id: number) => axiosClient.get<{ trace: AiTraceFull; related: AiTraceRelated[] }>(`/api/admin/ai-traces/${id}`),
  remove: (id: number) => axiosClient.delete(`/api/admin/ai-traces/${id}`),
  removeBefore: (before?: string) =>
    axiosClient.delete<{ removed: number }>('/api/admin/ai-traces', { params: before ? { before } : {} }),
  settings: () => axiosClient.get<AiTraceSettings>('/api/admin/ai-traces/settings'),
  setSettings: (value: string, retentionDays?: number) =>
    axiosClient.put<{ value: string; retentionDays: number }>('/api/admin/ai-traces/settings', { value, retentionDays }),
};
