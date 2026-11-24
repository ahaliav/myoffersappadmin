import axiosClient from './axiosClient';

/**
 * O13: the A1 quote chat's trade-specific questions (backend: /api/admin/chat-trade-questions). The chat asks them
 * word for word about items whose name has the keyword; only required, active rows are asked, and only while the
 * app setting qc_trade_questions is on.
 */
export interface TradeQuestion {
  id: number;
  trade: string;
  itemKeyword: string;
  detailKey: string;
  questionHe: string;
  optionsSource: string | null;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export type TradeQuestionInput = Omit<TradeQuestion, 'id' | 'updatedAt' | 'updatedBy'>;

/** The chat's switches (backend: /api/admin/quote-chat/settings): qc_enabled is off | on | users:<id>,<id>; the rest on | off. */
export interface QuoteChatSetting {
  key: 'qc_enabled' | 'qc_photos' | 'qc_trade_questions' | 'qc_ai_descriptions' | 'qc_guard_min_said_pct' | 'qc_guard_filler_words' | 'qc_targeted_edit' | 'qc_edit_ops' | 'qc_edit_verbatim_phrases' | 'qc_free_chat' | 'qc_max_questions' | 'qc_draft_mode'
    | 'qc_trade_terms_table' | 'qc_trade_terms_user' | 'qc_trade_terms_max'
    | 'qc_files' | 'qc_file_types' | 'qc_file_max_mb' | 'qc_file_max_chars' | 'qc_file_instruction_words'
    | 'qc_changed_line' | 'qc_suggestions' | 'qc_suggestions_max' | 'qc_place_findings' | 'qc_place_excluded' | 'qc_place_warranty'
    | 'qc_addon_per_unit' | 'qc_examples' | 'qc_examples_count' | 'qc_examples_pick' | 'qc_two_step';
  value: string;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface QuoteChatSettings {
  settings: QuoteChatSetting[];
  history: { key: string; value: string; changedAt: string; changedBy: string | null }[];
}

export const quoteChatSettingsApi = {
  get: () => axiosClient.get<QuoteChatSettings>('/api/admin/quote-chat/settings'),
  set: (key: string, value: string) => axiosClient.put(`/api/admin/quote-chat/settings/${key}`, { value }),
};

/** AI-12: a trade's words for {{trade_terms}} (backend: /api/admin/trade-terms). One row per trade; '*' = everyone. */
export interface TradeTerm {
  id: number;
  trade: string;
  terms: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export type TradeTermInput = Pick<TradeTerm, 'trade' | 'terms' | 'isActive'>;

export const tradeTermsApi = {
  list: () => axiosClient.get<TradeTerm[]>('/api/admin/trade-terms'),
  create: (body: TradeTermInput) => axiosClient.post<TradeTerm>('/api/admin/trade-terms', body),
  update: (id: number, body: TradeTermInput) => axiosClient.put<TradeTerm>(`/api/admin/trade-terms/${id}`, body),
  deactivate: (id: number) => axiosClient.delete(`/api/admin/trade-terms/${id}`),
};

/** AI-17: a tag question of the quote chat (סוג הלקוח, הגיע אליי מ, מצב הקשר). The three rows are fixed; the admin edits them. */
export interface TagQuestion {
  field: 'client_type' | 'customer_source' | 'contact_status';
  questionHe: string;
  required: boolean;
  sortOrder: number;
  timing: 'before_draft' | 'after_draft';
  audience: 'new_client' | 'all';
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export type TagQuestionInput = Pick<TagQuestion, 'questionHe' | 'required' | 'sortOrder' | 'timing' | 'audience' | 'isActive'>;

export const tagQuestionsApi = {
  list: () => axiosClient.get<TagQuestion[]>('/api/admin/chat-tag-questions'),
  update: (field: string, body: TagQuestionInput) => axiosClient.put<TagQuestion>(`/api/admin/chat-tag-questions/${field}`, body),
};

export const chatTradeQuestionsApi = {
  list: () => axiosClient.get<TradeQuestion[]>('/api/admin/chat-trade-questions'),
  create: (body: TradeQuestionInput) => axiosClient.post<TradeQuestion>('/api/admin/chat-trade-questions', body),
  update: (id: number, body: TradeQuestionInput) => axiosClient.put<TradeQuestion>(`/api/admin/chat-trade-questions/${id}`, body),
  deactivate: (id: number) => axiosClient.delete(`/api/admin/chat-trade-questions/${id}`),
};
