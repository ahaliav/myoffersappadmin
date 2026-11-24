import axiosClient from './axiosClient';

/**
 * AI-11 "מסך שומרים" (backend: /api/admin/ai-guards): every check that runs after an AI answer and drops, shortens or
 * replaces it, with its switch and threshold. Each time one acts, a line goes to "מה קרה בקריאה" (kind = guard).
 */
export interface AiGuardThreshold {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  value: number;
}

export interface AiGuard {
  key: string;
  area: string;
  label: string;
  does: string;
  locked: boolean;
  on: boolean;
  setting: string;
  threshold: AiGuardThreshold | null;
  firedLast7Days: number;
  lastFiredAt: string | null;
}

export const aiGuardsApi = {
  list: () => axiosClient.get<AiGuard[]>('/api/admin/ai-guards'),
  set: (key: string, body: { on?: boolean; threshold?: number }) => axiosClient.put<AiGuard>(`/api/admin/ai-guards/${key}`, body),
};
