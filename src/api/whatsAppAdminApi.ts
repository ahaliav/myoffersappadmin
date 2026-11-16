import axiosClient from './axiosClient';

/**
 * WhatsApp channel admin ("ערוץ וואטסאפ"). Backend: /api/admin/whatsapp (admins only). Settings and texts apply within
 * seconds (short cache); a business's switches apply on its next message. Phones are never sent here in full: the log has
 * an 8-character hash prefix and links a masked number.
 */
export interface WaQueueStats {
  queued: number;
  processing: number;
  dead: number;
  failed: number;
  oldestQueuedAt: string | null;
  lastReceivedAt: string | null;
}

export interface WaHealth {
  status: string;
  enabled: boolean;
  canReceive: boolean;
  canSend: boolean;
  queue: WaQueueStats;
  sentLastHour: number;
  failedLastHour: number;
  inboundLastHour: number;
  alerts: string[];
  counters: Record<string, number>;
}

export interface WaSettingRow { key: string; value: string; description: string | null; updatedAt: string | null; updatedBy: string | null }
export interface WaSettingsData { effective: Record<string, unknown>; rows: WaSettingRow[] }

export interface WaBusiness {
  id: number;
  name: string | null;
  /** false: no settings row yet — the values shown are the defaults (off). */
  configured: boolean;
  enabled: boolean;
  /** null: the global wa.phase_active. */
  phaseActive: number | null;
  beta: boolean;
  /** null: the global wa.daily_messages_cap. */
  dailyMessagesCap: number | null;
  roles: string;
  updatedAt: string | null;
  links: number;
}

export interface WaBusinessInput { enabled?: boolean; phaseActive?: number; beta?: boolean; dailyMessagesCap?: number; roles?: string }

export interface WaText { key: string; textHe: string; description: string | null; updatedAt: string | null; updatedBy: string | null }

export interface WaLogRow {
  id: number;
  createdAt: string;
  direction: 'in' | 'out';
  businessId: number | null;
  userId: number | null;
  type: string;
  text: string | null;
  transcript: string | null;
  intent: string | null;
  outcome: string | null;
  status: string | null;
  error: string | null;
  traceId: string | null;
  phone: string;
}

export interface WaLinkRow {
  id: number;
  businessId: number;
  userId: number;
  status: string;
  linkedAt: string | null;
  lastInboundAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  consentVersion: string | null;
  phone: string;
}

export interface WaDeadRow { id: number; waMessageId: string; type: string; receivedAt: string; attempts: number; lastError: string | null }

export const whatsAppAdminApi = {
  health: () => axiosClient.get<WaHealth>('/api/admin/whatsapp/health').then((r) => r.data),
  settings: () => axiosClient.get<WaSettingsData>('/api/admin/whatsapp/settings').then((r) => r.data),
  setSetting: (key: string, value: string) =>
    axiosClient.put<{ key: string; value: string }>(`/api/admin/whatsapp/settings/${encodeURIComponent(key)}`, { value }).then((r) => r.data),
  businesses: (q?: string) => axiosClient.get<WaBusiness[]>('/api/admin/whatsapp/businesses', { params: { q: q || undefined } }).then((r) => r.data),
  setBusiness: (id: number, body: WaBusinessInput) => axiosClient.put(`/api/admin/whatsapp/businesses/${id}`, body).then((r) => r.data),
  texts: () => axiosClient.get<WaText[]>('/api/admin/whatsapp/texts').then((r) => r.data),
  setText: (key: string, text: string) =>
    axiosClient.put<{ key: string; textHe: string }>(`/api/admin/whatsapp/texts/${encodeURIComponent(key)}`, { text }).then((r) => r.data),
  log: (q: { businessId?: number; userId?: number; outcome?: string; take?: number } = {}) =>
    axiosClient.get<WaLogRow[]>('/api/admin/whatsapp/log', { params: q }).then((r) => r.data),
  links: (businessId?: number) => axiosClient.get<WaLinkRow[]>('/api/admin/whatsapp/links', { params: { businessId } }).then((r) => r.data),
  dead: () => axiosClient.get<WaDeadRow[]>('/api/admin/whatsapp/dead').then((r) => r.data),
  requeue: () => axiosClient.post<{ requeued: number }>('/api/admin/whatsapp/dead/requeue').then((r) => r.data),
};

/** The server's error code ("bad_value", "button_too_long", …) as a Hebrew sentence. */
export function waErrorText(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { code?: string; max?: number } } };
  const code = err.response?.data?.code;
  switch (code) {
    case 'bad_value': return 'ערך לא תקין: צריך להיות מאותו סוג כמו הערך הנוכחי (כן/לא, מספר או טקסט).';
    case 'bad_text': return 'הטקסט ריק או ארוך מ-1000 תווים.';
    case 'button_too_long': return `טקסט של כפתור עד ${err.response?.data?.max ?? 20} תווים (מגבלה של מטא).`;
    case 'bad_phase': return 'שלב בין 0 ל-4.';
    case 'bad_cap': return 'מכסה יומית בין 1 ל-10,000.';
    case 'bad_roles': return 'תפקידים: owner חייב להיות ברשימה, ורק owner / manager / employee.';
    case 'unknown_setting': return 'אין הגדרה כזו.';
    case 'not_found': return 'העסק לא נמצא.';
    default: return 'השמירה נכשלה';
  }
}
