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
};
