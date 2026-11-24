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
  /** 0-2, null = provider default (Claude models ignore it). */
  temperature: number | null;
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
  /** Tool 4 (8.11): also call the AI once ("נסה עכשיו"). */
  run?: boolean;
  /** AI-24: the brochure's "מה לשנות?" (adds brochure_shared.mode_refine). */
  refine?: boolean;
}

/** AI-24 "הוסף בלוק": the layers an admin may add; the block starts as a draft and counts once published. */
export const ADDABLE_LAYERS = ['identity', 'base', 'example', 'output', 'style', 'length', 'type', 'mode'] as const;
export interface NewBlockRequest {
  layer: (typeof ADDABLE_LAYERS)[number];
  /** optional second block of a layer: Latin letters, digits, _ (e.g. negative_2) */
  variant?: string;
  text: string;
}

export interface WritingPreview {
  system: string;
  user: string;
  variablesUsed: string[];
  /** Fix 7 (8.11): blocks the code adds by situation (question, message, action, rules, read), variables filled in. */
  extras?: { key: string; layer: string; variant: string; text: string; maxTokens: number | null }[];
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  /** Tool 4 (8.11): the AI's raw answer when the preview was run ("נסה עכשיו"). */
  output?: string | null;
  runError?: string | null;
  servedBy?: string | null;
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
  /** Fix 1 (8.11): model, temperature and output length for this one prompt. */
  setSettings: (featureKey: string, body: { model: string | null; temperature: number | null; maxTokens: number | null }) =>
    axiosClient.put(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/settings`, body),
  addBlock: (featureKey: string, body: NewBlockRequest) =>
    axiosClient.post<WritingBlock>(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/blocks`, body),
  preview: (featureKey: string, body: WritingPreviewRequest) =>
    axiosClient.post<WritingPreview>(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/preview`, body),
  /** AI-25 "מחק בלוק": switched off (the AI stops getting it at once); "הוסף בלוק" with the same layer brings it back. */
  deleteBlock: (featureKey: string, blockId: number) =>
    axiosClient.delete(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/blocks/${blockId}`),
  testSet: (featureKey: string) => axiosClient.get<TestSet>(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/test-set`),
  addTestCase: (featureKey: string, body: { title: string; variables: Record<string, string> }) =>
    axiosClient.post<TestCase>(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/test-set/cases`, body),
  deleteTestCase: (featureKey: string, id: number) =>
    axiosClient.delete(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/test-set/cases/${id}`),
  orderTestCases: (featureKey: string, ids: number[]) =>
    axiosClient.put(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/test-set/order`, { ids }),
  runTestSet: (featureKey: string, body: { repeats: number; useDrafts: boolean }) =>
    axiosClient.post<TestRunResult>(`/api/admin/ai-writing/features/${encodeURIComponent(featureKey)}/test-set/run`, body),
};

/** AI-25 "בדיקות שמורות": a prompt's fixed messages, run 1–3 times each; every run kept and compared with the one before. */
export interface TestCase { id: number; title: string; variables: Record<string, string | null>; sortOrder: number }
export interface TestCaseResult { caseId: number; title: string; outputs: (string | null)[]; errors: (string | null)[] }
export interface TestRun { id: number; createdAt: string; createdBy: string | null; useDrafts: boolean; repeats: number; fingerprint: string; results: TestCaseResult[] }
export interface TestCompare { caseId: number; title: string; changed: boolean; stable: boolean; previousStable: boolean | null; new: boolean }
export interface TestSet { cases: TestCase[]; runs: TestRun[]; maxCases: number; maxRepeats: number }
export interface TestRunResult { run: TestRun; previous: TestRun | null; comparison: TestCompare[] }

/** Fix 7 (8.11): the saved AI answers (customer card analyses, data page answers), counted and cleared on demand. */
export interface AiCacheCounts {
  customerAnalyses: number;
  dataAnswers: number;
}

export const aiCacheAdminApi = {
  counts: (userId?: number | null) =>
    axiosClient.get<AiCacheCounts>('/api/admin/ai-cache', { params: userId ? { userId } : undefined }),
  clearCustomerAnalyses: (userId?: number | null) =>
    axiosClient.delete<{ deleted: number }>('/api/admin/ai-cache/customer-analyses', { params: userId ? { userId } : undefined }),
  clearDataAnswers: (userId?: number | null) =>
    axiosClient.delete<{ deleted: number }>('/api/admin/ai-cache/data-answers', { params: userId ? { userId } : undefined }),
};
