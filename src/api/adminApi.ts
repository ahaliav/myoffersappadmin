import axios from 'axios';
import axiosClient from './axiosClient';

export interface ApplicationLogDto {
  id?: number;
  Id?: number;
  createdAt?: string;
  CreatedAt?: string;
  level?: string;
  Level?: string;
  category?: string;
  Category?: string;
  message?: string;
  Message?: string;
  exception?: string | null;
  Exception?: string | null;
}

export function normalizeLog(row: ApplicationLogDto): {
  id: number;
  createdAt: string;
  level: string;
  category: string;
  message: string;
  exception: string | null;
} {
  return {
    id: row.id ?? row.Id ?? 0,
    createdAt: row.createdAt ?? row.CreatedAt ?? '',
    level: row.level ?? row.Level ?? '',
    category: row.category ?? row.Category ?? '',
    message: row.message ?? row.Message ?? '',
    exception: row.exception ?? row.Exception ?? null,
  };
}

export interface ApplicationLogsResponse {
  items?: ApplicationLogDto[];
  total?: number;
  Items?: ApplicationLogDto[];
  Total?: number;
}

export interface AdminUser {
  id?: number;
  Id?: number;
  fullName?: string;
  FullName?: string;
  email?: string;
  Email?: string;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
  UpdatedAt?: string;
}

export interface AiPromptDto {
  id: number;
  key: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate?: string | null;
  model?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiPromptUpdateDto {
  name: string;
  systemPrompt: string;
  userPromptTemplate?: string | null;
  model?: string | null;
  sortOrder: number;
}

export interface SubscriptionAdminDto {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  planId: number;
  planName: string;
  planCode: string;
  isTrial: boolean;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  startDate: string;
  endDate?: string | null;
  amount: number;
  status: string;
  autoRenew: boolean;
  renewalDiscountPercent?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUpdateSubscriptionDto {
  status?: string;
  endDate?: string | null;
  autoRenew?: boolean;
  renewalDiscountPercent?: number | null;
}

export interface PlanDto {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  currency: string;
  billingPeriod: string;
  trialDays?: number | null;
  isActive: boolean;
  displayOrder: number;
  features?: string | null;
  aiMonthlyRequestLimit?: number | null;
  aiMonthlyTokenLimit?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  name: string;
  code: string;
  description?: string | null;
  price: number;
  currency: string;
  billingPeriod: string;
  trialDays?: number | null;
  isActive: boolean;
  displayOrder: number;
  features?: string | null;
  aiMonthlyRequestLimit?: number | null;
  aiMonthlyTokenLimit?: number | null;
}

export interface AdminAiUsageRowDto {
  userId: number;
  email: string;
  fullName: string;
  planName?: string | null;
  planCode?: string | null;
  baseRequestLimit: number;
  baseTokenLimit?: number | null;
  bonusMonthlyRequests: number;
  bonusMonthlyTokens: number;
  overrideRequestLimit?: number | null;
  overrideTokenLimit?: number | null;
  effectiveRequestLimit: number;
  effectiveTokenLimit?: number | null;
  requestsUsed: number;
  tokensUsed: number;
  periodYearMonth: string;
}

export interface AdminUpdateUserAiQuotaDto {
  bonusMonthlyRequests: number;
  bonusMonthlyTokens: number;
  overrideRequestLimit?: number | null;
  overrideTokenLimit?: number | null;
}

export interface AdminAiUsageLogDto {
  id: number;
  createdAt: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
}

export interface AdminAiUsageLogsResponse {
  items: AdminAiUsageLogDto[];
  total: number;
}

export interface AdminOfferEngagementDto {
  offerId?: number;
  OfferId?: number;
  userId?: number;
  UserId?: number;
  userEmail?: string;
  UserEmail?: string;
  userFullName?: string;
  UserFullName?: string;
  customerFullName?: string | null;
  CustomerFullName?: string | null;
  customerEmail?: string | null;
  CustomerEmail?: string | null;
  title?: string;
  Title?: string;
  status?: string;
  Status?: string;
  createdAt?: string;
  CreatedAt?: string;
  externalLinkOpenCount?: number;
  ExternalLinkOpenCount?: number;
  lastExternalLinkViewAt?: string | null;
  LastExternalLinkViewAt?: string | null;
  isSigned?: boolean;
  IsSigned?: boolean;
  signedAt?: string | null;
  SignedAt?: string | null;
}

export function normalizeOfferEngagement(row: AdminOfferEngagementDto) {
  return {
    offerId: row.offerId ?? row.OfferId ?? 0,
    userId: row.userId ?? row.UserId ?? 0,
    userEmail: row.userEmail ?? row.UserEmail ?? '',
    userFullName: row.userFullName ?? row.UserFullName ?? '',
    customerFullName: row.customerFullName ?? row.CustomerFullName ?? null,
    customerEmail: row.customerEmail ?? row.CustomerEmail ?? null,
    title: row.title ?? row.Title ?? '',
    status: row.status ?? row.Status ?? '',
    createdAt: row.createdAt ?? row.CreatedAt ?? '',
    externalLinkOpenCount: row.externalLinkOpenCount ?? row.ExternalLinkOpenCount ?? 0,
    lastExternalLinkViewAt: row.lastExternalLinkViewAt ?? row.LastExternalLinkViewAt ?? null,
    isSigned: row.isSigned ?? row.IsSigned ?? false,
    signedAt: row.signedAt ?? row.SignedAt ?? null,
  };
}

export interface MyAiUsageStatusDto {
  periodYearMonth: string;
  requestsUsed: number;
  tokensUsed: number;
  effectiveRequestLimit: number;
  effectiveTokenLimit?: number | null;
  remainingRequests: number;
  remainingTokens?: number | null;
  planName?: string | null;
  planCode?: string | null;
  baseRequestLimit: number;
  baseTokenLimit?: number | null;
  bonusMonthlyRequests: number;
  bonusMonthlyTokens: number;
  overrideRequestLimit?: number | null;
  overrideTokenLimit?: number | null;
}

// baseURL includes /api/ and server uses PathBase /api → paths need /api/admin to get /api/api/admin
export const adminApi = {
  getLogs: (params?: { limit?: number; offset?: number; level?: string; from?: string; to?: string }) =>
    axiosClient.get<ApplicationLogsResponse>('/api/admin/logs', { params }),

  getUsers: () =>
    axiosClient.get<AdminUser[]>('/api/admin/users'),

  getAiPrompts: () =>
    axiosClient.get<AiPromptDto[]>('/api/admin/ai-prompts'),

  updateAiPrompt: (id: number, data: AiPromptUpdateDto) =>
    axiosClient.put<AiPromptDto>(`/api/admin/ai-prompts/${id}`, data),

  getSubscriptions: () =>
    axiosClient.get<SubscriptionAdminDto[]>('/api/admin/subscriptions'),

  updateSubscription: (id: number, data: AdminUpdateSubscriptionDto) =>
    axiosClient.put<SubscriptionAdminDto>(`/api/admin/subscriptions/${id}`, data),

  getPlans: () =>
    axiosClient.get<PlanDto[]>('/api/admin/plans'),

  createPlan: (data: CreatePlanRequest) =>
    axiosClient.post<PlanDto>('/api/admin/plans', data),

  updatePlan: (id: number, data: CreatePlanRequest) =>
    axiosClient.put<PlanDto>(`/api/admin/plans/${id}`, data),

  deletePlan: (id: number) =>
    axiosClient.delete(`/api/admin/plans/${id}`),

  getAiUsageOverview: () =>
    axiosClient.get<AdminAiUsageRowDto[]>('/api/admin/ai-usage'),

  getAiUsageLogs: (userId: number, params?: { limit?: number; offset?: number }) =>
    axiosClient.get<AdminAiUsageLogsResponse>(`/api/admin/ai-usage/${userId}/logs`, { params }),

  updateUserAiQuota: (userId: number, data: AdminUpdateUserAiQuotaDto) =>
    axiosClient.put<MyAiUsageStatusDto>(`/api/admin/ai-usage/${userId}/quota`, data),

  getOffersEngagement: () =>
    axiosClient.get<AdminOfferEngagementDto[]>('/api/admin/offers/engagement'),

  getOfferPdf: (offerId: number, params: { signed: boolean }) =>
    axiosClient.get<Blob>(`/api/admin/offers/${offerId}/pdf`, {
      params: { signed: params.signed },
      responseType: 'blob',
    }),
};

// ── AI Architecture: Data Variables ────────────────────────────────────────

export interface DataVariableDto {
  id: number;
  key: string;
  name: string;
  description?: string;
  sqlQuery: string;
  resultFormat: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataVariableCreateDto {
  key: string;
  name: string;
  description?: string;
  sqlQuery: string;
  resultFormat: string;
}

export interface DataVariableUpdateDto {
  name: string;
  description?: string;
  sqlQuery: string;
  resultFormat: string;
  isActive: boolean;
}

// ── AI Architecture: Prompt Versions ───────────────────────────────────────

export interface PromptVersionDto {
  id: number;
  promptId: number;
  versionNumber: number;
  systemPrompt: string;
  userPromptTemplate?: string;
  model?: string;
  notes?: string;
  createdAt: string;
}

// ── AI Architecture: Prompt Bindings ───────────────────────────────────────

export interface PromptDataBindingDto {
  id: number;
  promptId: number;
  variableId: number;
  variableKey: string;
  placeholderKey: string;
  sortOrder: number;
}

export interface PromptDataBindingCreateDto {
  promptId: number;
  variableId: number;
  placeholderKey: string;
  sortOrder: number;
}

// ── AI Architecture: Tool Registry ─────────────────────────────────────────

export interface AiToolDbDto {
  id: number;
  name: string;
  displayName: string;
  description: string;
  jsonSchema: string;
  handlerName: string;
  scope: string;
  requiresConfirmation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function n<T>(v: T | undefined, fallback: T): T {
  return v !== undefined ? v : fallback;
}

function normalizeDataVariable(d: Record<string, unknown>): DataVariableDto {
  return {
    id: n(d.id ?? d.Id, 0) as number,
    key: n(d.key ?? d.Key, '') as string,
    name: n(d.name ?? d.Name, '') as string,
    description: (d.description ?? d.Description) as string | undefined,
    sqlQuery: n(d.sqlQuery ?? d.SqlQuery, '') as string,
    resultFormat: n(d.resultFormat ?? d.ResultFormat, 'json') as string,
    isActive: n(d.isActive ?? d.IsActive, true) as boolean,
    createdAt: n(d.createdAt ?? d.CreatedAt, '') as string,
    updatedAt: n(d.updatedAt ?? d.UpdatedAt, '') as string,
  };
}

function normalizePromptVersion(v: Record<string, unknown>): PromptVersionDto {
  return {
    id: n(v.id ?? v.Id, 0) as number,
    promptId: n(v.promptId ?? v.PromptId, 0) as number,
    versionNumber: n(v.versionNumber ?? v.VersionNumber, 0) as number,
    systemPrompt: n(v.systemPrompt ?? v.SystemPrompt, '') as string,
    userPromptTemplate: (v.userPromptTemplate ?? v.UserPromptTemplate) as string | undefined,
    model: (v.model ?? v.Model) as string | undefined,
    notes: (v.notes ?? v.Notes) as string | undefined,
    createdAt: n(v.createdAt ?? v.CreatedAt, '') as string,
  };
}

function normalizeBinding(b: Record<string, unknown>): PromptDataBindingDto {
  return {
    id: n(b.id ?? b.Id, 0) as number,
    promptId: n(b.promptId ?? b.PromptId, 0) as number,
    variableId: n(b.variableId ?? b.VariableId, 0) as number,
    variableKey: n(b.variableKey ?? b.VariableKey, '') as string,
    placeholderKey: n(b.placeholderKey ?? b.PlaceholderKey, '') as string,
    sortOrder: n(b.sortOrder ?? b.SortOrder, 0) as number,
  };
}

function normalizeAiTool(t: Record<string, unknown>): AiToolDbDto {
  return {
    id: n(t.id ?? t.Id, 0) as number,
    name: n(t.name ?? t.Name, '') as string,
    displayName: n(t.displayName ?? t.DisplayName, '') as string,
    description: n(t.description ?? t.Description, '') as string,
    jsonSchema: n(t.jsonSchema ?? t.JsonSchema, '') as string,
    handlerName: n(t.handlerName ?? t.HandlerName, '') as string,
    scope: n(t.scope ?? t.Scope, 'user') as string,
    requiresConfirmation: n(t.requiresConfirmation ?? t.RequiresConfirmation, false) as boolean,
    isActive: n(t.isActive ?? t.IsActive, true) as boolean,
    createdAt: n(t.createdAt ?? t.CreatedAt, '') as string,
    updatedAt: n(t.updatedAt ?? t.UpdatedAt, '') as string,
  };
}

export const aiArchitectureApi = {
  // Data Variables
  getDataVariables: () =>
    axiosClient.get<unknown[]>('/api/admin/data-variables').then((r) => ({
      ...r, data: r.data.map((x) => normalizeDataVariable(x as Record<string, unknown>)),
    })),
  createDataVariable: (dto: DataVariableCreateDto) =>
    axiosClient.post<unknown>('/api/admin/data-variables', dto).then((r) => ({
      ...r, data: normalizeDataVariable(r.data as Record<string, unknown>),
    })),
  updateDataVariable: (id: number, dto: DataVariableUpdateDto) =>
    axiosClient.put(`/api/admin/data-variables/${id}`, dto),
  deleteDataVariable: (id: number) =>
    axiosClient.delete(`/api/admin/data-variables/${id}`),

  // Prompt Versions
  getPromptVersions: (promptId: number) =>
    axiosClient.get<unknown[]>(`/api/admin/prompt-versions/${promptId}`).then((r) => ({
      ...r, data: r.data.map((x) => normalizePromptVersion(x as Record<string, unknown>)),
    })),
  snapshotPrompt: (promptId: number, notes?: string) =>
    axiosClient.post(`/api/admin/prompt-versions/${promptId}/snapshot`, JSON.stringify(notes ?? null)),
  rollbackPrompt: (promptId: number, versionNumber: number) =>
    axiosClient.post(`/api/admin/prompt-versions/${promptId}/rollback/${versionNumber}`),

  // Prompt Bindings
  getPromptBindings: (promptId: number) =>
    axiosClient.get<unknown[]>(`/api/admin/prompt-bindings/${promptId}`).then((r) => ({
      ...r, data: r.data.map((x) => normalizeBinding(x as Record<string, unknown>)),
    })),
  createPromptBinding: (dto: PromptDataBindingCreateDto) =>
    axiosClient.post('/api/admin/prompt-bindings', dto),
  deletePromptBinding: (id: number) =>
    axiosClient.delete(`/api/admin/prompt-bindings/${id}`),

  // AI Tools Registry
  getAiTools: () =>
    axiosClient.get<unknown[]>('/api/admin/ai-tools-registry').then((r) => ({
      ...r, data: r.data.map((x) => normalizeAiTool(x as Record<string, unknown>)),
    })),
  toggleAiTool: (id: number, isActive: boolean) =>
    axiosClient.patch(`/api/admin/ai-tools-registry/${id}/toggle`, { isActive }),
};

/** Opens quote PDF in a new tab (auth via axios interceptor). */
export async function openAdminOfferPdfInNewTab(offerId: number, signed: boolean): Promise<void> {
  try {
    const res = await adminApi.getOfferPdf(offerId, { signed });
    const blob =
      res.data instanceof Blob
        ? res.data
        : new Blob([res.data as BlobPart], { type: res.headers['content-type'] || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      URL.revokeObjectURL(url);
      throw new Error('לא ניתן לפתוח חלון חדש — בדוק חסימת חלונות קופצים');
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 404 && e.response.data instanceof Blob) {
      const text = await e.response.data.text();
      let msg = 'לא נמצא PDF למסמך זה';
      try {
        const j = JSON.parse(text) as { message?: string };
        if (typeof j.message === 'string' && j.message.trim()) msg = j.message;
      } catch {
        /* ignore invalid JSON */
      }
      throw new Error(msg);
    }
    throw e;
  }
}
