import axiosClient from "./axiosClient";

export interface AdminChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AdminChatToolCallTrace {
  name: string;
  arguments: string;
  resultPreview: string;
}

export interface AdminChatResponse {
  reply: string;
  toolCalls: AdminChatToolCallTrace[];
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  rounds: number;
}

export const aiAdminApi = {
  ask: (messages: AdminChatMessage[]) =>
    axiosClient.post<AdminChatResponse>("/api/admin/ai-chat", { messages }),
};
