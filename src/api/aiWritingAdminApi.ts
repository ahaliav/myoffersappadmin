import axiosClient from './axiosClient';

/** Admin editor for the layered "כתיבה עם AI" prompts (backend: /api/admin/ai-writing). */

export interface WritingBlock {
  id: number;
  key: string;
  layer: string;
  variant: string;
  text: string;
  draft: string | null;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  /** Output contracts that code depends on: read-only. */
  outputLocked: boolean;
  /** False for rows written in development (not taken from a prompt brief). */
  fromBrief: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
}

export interface WritingFeature {
  id: number;
  key: string;
  name: string;
  area: string | null;
  isActive: boolean;
  maxTokens: number | null;
  model: string | null;
  userTemplate: string | null;
  userTemplateDraft: string | null;
  description: string;
  modes: string[];
  styleList: string | null;
  lengthList: string | null;
  typeList: string | null;
  blocks: WritingBlock[];
}

export interface WritingVersion {
  versionNumber: number;
  text: string;
  notes: string | null;
  publishedBy: string | null;
  createdAt: string;
}

export interface WritingPreviewRequest {
  mode?: string;
  style?: string | null;
  length?: string | null;
  type?: string | null;
  variables: Record<string, string>;
  useDrafts: boolean;
}

export interface WritingPreview {
  system: string;
  user: string;
  variablesUsed: string[];
}

export const aiWritingAdminApi = {
  features: () => axiosClient.get<WritingFeature[]>('/api/admin/ai-writing/features'),
  saveDraft: (blockId: number, text: string) =>
    axiosClient.put<WritingBlock>(`/api/admin/ai-writing/blocks/${blockId}/draft`, { text }),
  discardDraft: (blockId: number) => axiosClient.delete(`/api/admin/ai-writing/blocks/${blockId}/draft`),
  publish: (blockId: number) =>
    axiosClient.post<{ version: number; block: WritingBlock }>(`/api/admin/ai-writing/blocks/${blockId}/publish`),
  versions: (blockId: number) => axiosClient.get<WritingVersion[]>(`/api/admin/ai-writing/blocks/${blockId}/versions`),
  rollback: (blockId: number, version: number) =>
    axiosClient.post<{ version: number; block: WritingBlock }>(`/api/admin/ai-writing/blocks/${blockId}/rollback/${version}`),
  setActive: (featureKey: string, isActive: boolean) =>
    axiosClient.put(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/active`, { isActive }),
  preview: (featureKey: string, body: WritingPreviewRequest) =>
    axiosClient.post<WritingPreview>(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/preview`, body),
};
