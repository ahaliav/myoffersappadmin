import axiosClient from './axiosClient';

/**
 * F-9: the data page's numbers (dp_* / ga_* / close_rate_*), its 29 questions and its smart-insight rules.
 * Backend: /api/admin/data-settings. A change is live at once and kept in the history.
 */
export interface DataSetting { key: string; value: string; description: string | null; updatedAt: string | null; updatedBy: string | null }
export interface DataQuestionRow {
  key: string; section: string; sortOrder: number; title: string; subtitle: string | null; periodMode: string;
  instruction: string; exampleGood: string | null; exampleBad: string | null; isActive: boolean;
}
export interface InsightRuleRow { key: string; section: string; priority: number; template: string; questionKey: string | null; isActive: boolean }
export interface DataHistory { key: string; value: string; changedAt: string; changedBy: string | null; canRestore: boolean }

export interface DataSettings {
  settings: DataSetting[];
  questions: DataQuestionRow[];
  rules: InsightRuleRow[];
  history: DataHistory[];
}

/** The monthly check of "תהיה לי עבודה לחודש הבא?": per month, how many forecasts landed in their range. */
export interface ForecastAccuracyMonth { month: string; forecasts: number; withRange: number; inRange: number; averageMiss: number }

export type QuestionEdit = Pick<DataQuestionRow, 'title' | 'subtitle' | 'instruction' | 'exampleGood' | 'exampleBad' | 'isActive'>;

export const dataSettingsApi = {
  get: () => axiosClient.get<DataSettings>('/api/admin/data-settings').then((r) => r.data),
  forecastAccuracy: () => axiosClient.get<ForecastAccuracyMonth[]>('/api/admin/data-settings/forecast-accuracy').then((r) => r.data),
  setSetting: (key: string, value: string) => axiosClient.put(`/api/admin/data-settings/settings/${encodeURIComponent(key)}`, { value }),
  setQuestion: (key: string, q: QuestionEdit) => axiosClient.put(`/api/admin/data-settings/questions/${encodeURIComponent(key)}`, q),
  setRule: (key: string, template: string, priority: number, isActive: boolean) =>
    axiosClient.put(`/api/admin/data-settings/rules/${encodeURIComponent(key)}`, { template, priority, isActive }),
};
