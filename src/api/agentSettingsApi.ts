import axiosClient from './axiosClient';

/**
 * E12: the customer agent's numbers (client_agent.*, the 20 states' client_state.*), texts (ui_texts client_agent.*) and
 * tables (message topics, router intents, customer types). Backend: /api/admin/agent-settings. A change is live at once.
 */
export interface AgentSetting { key: string; value: string; description: string | null; updatedAt: string | null; updatedBy: string | null }
export interface AgentText { key: string; value: string; description: string | null }
export interface AgentListItem { listKey: string; itemKey: string; label: string; isActive: boolean; sortOrder: number }
export interface AgentHistory { key: string; value: string; changedAt: string; changedBy: string | null }

export interface AgentSettings {
  settings: AgentSetting[];
  texts: AgentText[];
  lists: AgentListItem[];
  history: AgentHistory[];
}

export const agentSettingsApi = {
  get: () => axiosClient.get<AgentSettings>('/api/admin/agent-settings').then((r) => r.data),
  setSetting: (key: string, value: string) => axiosClient.put(`/api/admin/agent-settings/settings/${encodeURIComponent(key)}`, { value }),
  setText: (key: string, value: string) => axiosClient.put(`/api/admin/agent-settings/texts/${encodeURIComponent(key)}`, { value }),
  setListItem: (listKey: string, itemKey: string, label: string, isActive: boolean) =>
    axiosClient.put(`/api/admin/agent-settings/lists/${encodeURIComponent(listKey)}/${encodeURIComponent(itemKey)}`, { label, isActive }),
  /** AI-25: a new ready question on a Today smart screen (general_chips.{screen}); position 1 = first. */
  addListItem: (listKey: string, body: { itemKey: string; label: string; isActive?: boolean; position?: number }) =>
    axiosClient.post(`/api/admin/agent-settings/lists/${encodeURIComponent(listKey)}`, body),
  removeListItem: (listKey: string, itemKey: string) =>
    axiosClient.delete(`/api/admin/agent-settings/lists/${encodeURIComponent(listKey)}/${encodeURIComponent(itemKey)}`),
  /** Every item key of the list, once, in the new order. */
  orderList: (listKey: string, itemKeys: string[]) =>
    axiosClient.put(`/api/admin/agent-settings/lists/${encodeURIComponent(listKey)}/order`, { itemKeys }),
};
