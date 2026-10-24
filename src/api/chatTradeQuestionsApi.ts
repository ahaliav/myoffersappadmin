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

export const chatTradeQuestionsApi = {
  list: () => axiosClient.get<TradeQuestion[]>('/api/admin/chat-trade-questions'),
  create: (body: TradeQuestionInput) => axiosClient.post<TradeQuestion>('/api/admin/chat-trade-questions', body),
  update: (id: number, body: TradeQuestionInput) => axiosClient.put<TradeQuestion>(`/api/admin/chat-trade-questions/${id}`, body),
  deactivate: (id: number) => axiosClient.delete(`/api/admin/chat-trade-questions/${id}`),
};
