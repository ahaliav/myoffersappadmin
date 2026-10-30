import axiosClient from './axiosClient';

/**
 * E12 state builder: customer states the admin builds from the field registry (all conditions must hold), with a line, a dot,
 * an urgency and a recipe button. Backend: /api/admin/custom-states. A save is live at once and kept in the history.
 */
export type FieldType = 'text' | 'number' | 'bool';
export type DotPolicy = 'yes' | 'once' | 'once_a_year' | 'no';
export type StepType = 'message' | 'prep_call' | 'consult' | 'reminder';

export interface CustomField { key: string; label: string; type: FieldType; unit: string | null; ops: string[] }
export interface CustomCondition { field: string; op: string; value: string }
export interface RecipeStep { type: StepType; topic?: string | null; days?: number | null; text?: string | null }
export interface CustomRecipe { label: string; steps: RecipeStep[] }

export interface CustomState {
  id: number;
  key: string;
  name: string;
  line: string;
  conditions: CustomCondition[];
  dot: DotPolicy;
  urgency: number;
  isActive: boolean;
  recipe: CustomRecipe | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export type CustomStateInput = Omit<CustomState, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>;

export interface CustomStateVersion {
  id: number;
  stateId: number;
  key: string;
  action: 'create' | 'update' | 'delete';
  snapshot: Partial<CustomState>;
  changedAt: string;
  changedBy: string | null;
}

export interface CustomStatesData {
  states: CustomState[];
  fields: CustomField[];
  ops: Record<string, string>;
  builtIns: { order: number; key: string; name: string }[];
  stepTypes: StepType[];
  history: CustomStateVersion[];
}

export const customStatesApi = {
  get: () => axiosClient.get<CustomStatesData>('/api/admin/custom-states').then((r) => r.data),
  create: (body: CustomStateInput) => axiosClient.post<CustomState>('/api/admin/custom-states', body).then((r) => r.data),
  update: (id: number, body: CustomStateInput) => axiosClient.put<CustomState>(`/api/admin/custom-states/${id}`, body).then((r) => r.data),
  remove: (id: number) => axiosClient.delete(`/api/admin/custom-states/${id}`),
  /** "מתאים עכשיו ל-N לקוחות": across every business, a number only. */
  preview: (conditions: CustomCondition[]) =>
    axiosClient.post<{ count: number; text: string }>('/api/admin/custom-states/preview', { conditions }).then((r) => r.data),
};
