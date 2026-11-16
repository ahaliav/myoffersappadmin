import axiosClient from './axiosClient';

/**
 * B10 · the global role → permission matrix: the defaults every business starts from. A business's own override and a
 * member's override still win. Backend: /api/admin/role-permissions (admins only). A change applies on the member's next request.
 */
export type TeamRole = 'manager' | 'employee';

export interface RoleCell {
  allowed: boolean;
  stored: boolean;
  updatedAt: string | null;
  updatedBy: number | null;
  businessOverrides: number;
}

export interface PermissionRow { permission: string; grantable: boolean; roles: Record<TeamRole, RoleCell> }
export interface RoleMatrix { roles: TeamRole[]; permissions: PermissionRow[] }

export interface RolePermissionChange {
  id: number;
  role: TeamRole;
  permission: string;
  oldAllowed: boolean | null;
  newAllowed: boolean;
  actorUserId: number | null;
  createdAt: string;
}

export const rolePermissionsApi = {
  matrix: () => axiosClient.get<RoleMatrix>('/api/admin/role-permissions').then((r) => r.data),
  set: (role: TeamRole, permission: string, allowed: boolean) =>
    axiosClient.put<{ changed: boolean }>('/api/admin/role-permissions', { role, permission, allowed }).then((r) => r.data),
  history: (limit = 100) => axiosClient.get<RolePermissionChange[]>('/api/admin/role-permissions/history', { params: { limit } }).then((r) => r.data),
};

/** Hebrew names for the permission keys (backend: myoffers.api/Team/Permissions.cs). */
export const PERMISSION_LABELS: Record<string, string> = {
  'money.view': 'רואה סכומים ומחירים',
  'payments.record': 'רושם תשלומים',
  'quote.status': 'משנה סטטוס של הצעה',
  'quote.renew': 'מחדש הצעה',
  'quote.create': 'יוצר הצעות',
  'costs.money': 'רושם עלויות בכסף',
  'job.time': 'רושם שעות עבודה',
  'job.done': 'מסמן עבודה כגמורה',
  'notes.write': 'כותב הערות',
  'photos.write': 'מוסיף תמונות',
  'clients.create': 'יוצר לקוחות',
  'calendar.self': 'היומן שלו',
  'calendar.work_start': 'קובע תחילת עבודה ביומן',
  'metrics.business': 'רואה נתוני העסק',
  'advisor.use': 'משתמש ביועץ',
  'messages.write': 'מנסח הודעות ללקוחות',
  'members.manage': 'מנהל את הצוות',
  'wa.connect': 'מתחבר לוואטסאפ',
  'wa.manage_links': 'מנהל חיבורי וואטסאפ',
};

export const ROLE_LABELS: Record<TeamRole, string> = { manager: 'מנהל', employee: 'עובד' };

export const ERROR_TEXT: Record<string, string> = {
  invalid_role: 'תפקיד לא תקין.',
  unknown_permission: 'הרשאה לא מוכרת.',
  allowed_required: 'חסר ערך.',
  cannot_grant: 'ניהול הצוות נשאר רק לבעלים.',
};
