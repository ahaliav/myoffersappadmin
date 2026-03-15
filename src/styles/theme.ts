import 'styled-components';

export const theme = {
  colors: {
    sidebar: '#0f172a',
    sidebarHover: '#1e293b',
    sidebarActive: '#3b82f6',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    error: '#dc2626',
    warning: '#d97706',
    success: '#059669',
    info: '#0ea5e9',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
  },
};

export type Theme = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
