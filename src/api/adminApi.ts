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

export const adminApi = {
  getLogs: (params?: { limit?: number; offset?: number; level?: string; from?: string; to?: string }) =>
    axiosClient.get<ApplicationLogsResponse>('/api/admin/logs', { params }),

  getUsers: () =>
    axiosClient.get<AdminUser[]>('/api/admin/users'),

  getAiPrompts: () =>
    axiosClient.get<AiPromptDto[]>('/api/admin/ai-prompts'),

  updateAiPrompt: (id: number, data: AiPromptUpdateDto) =>
    axiosClient.put<AiPromptDto>(`/api/admin/ai-prompts/${id}`, data),
};
