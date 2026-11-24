import axiosClient from './axiosClient';

/**
 * B34: the business advisor's content (backend: /api/admin/advisor). The site draws whatever these tables hold, so a
 * change here shows on the card's next open. The ad_* settings are in feature-settings (AI behaviour cards), the fixed
 * texts in ui_texts (advisor.*), the prompts in the prompts screen (advisor.identity, advisor_card_react, …).
 */
export type AdvisorGoal = 'more_jobs' | 'close_more' | 'earn_more';
export type AdvisorSource = 'catalog' | 'profession' | 'fixed' | 'free';

export interface AdvisorOption { key: string; label: string }

export interface AdvisorQuestion {
  key: string;
  text: string;
  source: AdvisorSource;
  options: AdvisorOption[];
  noneLabel?: string | null;
  profileKey?: string | null;
  catalogOrder?: 'most' | 'least' | null;
}

export interface AdminAdvisorCard {
  key: string;
  number: number;
  goal: AdvisorGoal;
  icon: string | null;
  title: string;
  subtitle: string;
  opening: string;
  questions: AdvisorQuestion[];
  kbKeys: string[];
  metrics: string[];
  outputSpec: Record<string, unknown>;
  numbersSpec: Record<string, unknown> | null;
  handoff: { kind: string; label: string; topic?: string; requires?: string } | null;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export type CardPatch = Partial<Omit<AdminAdvisorCard, 'key' | 'updatedAt' | 'updatedBy'>>;

/** The JSON columns of these tables travel as JSON text, both ways. */
export interface ProfileKeyRow { id: number; key: string; labelM: string; labelF: string; type: 'choice' | 'multi' | 'text' | 'yes_no'; goal: AdvisorGoal | null; askedBy: string; isActive: boolean }
export interface ProfessionRuleRow {
  id: number; profession: string; matchWords: string; reassures: string; clientFear: string; urgentMoments: string;
  neighborTrades: string; outcome: string; whenToCall: string; options: string; isActive: boolean; updatedAt: string;
}
export interface ChipRow {
  id: number; questionKey: string; isOn: boolean; kbKeys: string; questionHint: string | null;
  buttonType: 'none' | 'handoff_client' | 'card' | 'list' | 'expert' | 'bulk'; buttonTarget: string | null; minRule: string | null; version: number; updatedAt: string;
}
export interface PrincipleRow {
  id: number; kbKey: string; title: string; essence: string; backgroundOnlyNotes: string; dataAnchors: string; goals: string; isActive: boolean; version: number; updatedAt: string;
}

const base = '/api/admin/advisor';

export const advisorAdminApi = {
  cards: () => axiosClient.get<AdminAdvisorCard[]>(`${base}/cards`),
  createCard: (card: CardPatch & { key: string }) => axiosClient.post<AdminAdvisorCard>(`${base}/cards`, card),
  updateCard: (key: string, patch: CardPatch) => axiosClient.put<AdminAdvisorCard>(`${base}/cards/${key}`, patch),
  deleteCard: (key: string) => axiosClient.delete(`${base}/cards/${key}`),
  addQuestion: (key: string, q: Omit<AdvisorQuestion, 'key'> & { key?: string }) => axiosClient.post<AdminAdvisorCard>(`${base}/cards/${key}/questions`, q),
  updateQuestion: (key: string, q: AdvisorQuestion) => axiosClient.put<AdminAdvisorCard>(`${base}/cards/${key}/questions/${q.key}`, q),
  deleteQuestion: (key: string, questionKey: string) => axiosClient.delete<AdminAdvisorCard>(`${base}/cards/${key}/questions/${questionKey}`),
  reorder: (key: string, keys: string[]) => axiosClient.put<AdminAdvisorCard>(`${base}/cards/${key}/questions-order`, { keys }),
  profileKeys: () => axiosClient.get<ProfileKeyRow[]>(`${base}/profile-keys`),
  saveProfileKey: (row: ProfileKeyRow) => axiosClient.put<ProfileKeyRow>(`${base}/profile-keys/${row.key}`, row),
  professionRules: () => axiosClient.get<ProfessionRuleRow[]>(`${base}/profession-rules`),
  saveProfessionRule: (row: ProfessionRuleRow) => row.id
    ? axiosClient.put<ProfessionRuleRow>(`${base}/profession-rules/${row.id}`, row)
    : axiosClient.post<ProfessionRuleRow>(`${base}/profession-rules`, row),
  chipMap: () => axiosClient.get<ChipRow[]>(`${base}/chip-map`),
  saveChip: (row: ChipRow) => axiosClient.put<ChipRow>(`${base}/chip-map/${encodeURIComponent(row.questionKey)}`, row),
  principles: () => axiosClient.get<PrincipleRow[]>(`${base}/principles`),
  savePrinciple: (row: PrincipleRow) => axiosClient.put<PrincipleRow>(`${base}/principles/${row.kbKey}`, row),
};

/** The server's error code (ADVISOR_…) or message. */
export function advisorError(e: unknown): string {
  const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return ERRORS[data?.error ?? ''] ?? data?.error ?? data?.message ?? 'שגיאה בשמירה';
}

const ERRORS: Record<string, string> = {
  ADVISOR_QUESTION_TEXT_REQUIRED: 'לשאלה חסר טקסט',
  ADVISOR_QUESTION_SOURCE_INVALID: 'מקור הכפתורים חייב להיות catalog, profession, fixed או free',
  ADVISOR_PROFILE_KEY_UNKNOWN: 'שדה הפרופיל לא קיים. מוסיפים אותו קודם בלשונית "שדות הפרופיל"',
  ADVISOR_FIXED_NEEDS_OPTIONS: 'לשאלה עם כפתורים קבועים צריך לפחות כפתור אחד',
  ADVISOR_OPTION_LABEL_REQUIRED: 'לכפתור חסר טקסט',
  ADVISOR_NUMBERS_SPEC_INVALID: 'כרטיס המספרים: kind חייב להיות progress, versus, compare, ranked, split, columns או people',
  ADVISOR_HANDOFF_INVALID: 'הכפתור לסוכן הלקוח צריך kind ו-label',
  ADVISOR_TITLE_REQUIRED: 'לכרטיס חסרה כותרת',
  ADVISOR_TOO_MANY_QUESTIONS: 'עד 10 שאלות בכרטיס',
  ADVISOR_TEXT_TOO_LONG: 'הטקסט ארוך מדי',
};
