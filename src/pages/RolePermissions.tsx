import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { History } from 'lucide-react';
import {
  ERROR_TEXT,
  PERMISSION_LABELS,
  ROLE_LABELS,
  rolePermissionsApi,
  type RoleMatrix,
  type RolePermissionChange,
  type TeamRole,
} from '../api/rolePermissionsApi';

const Wrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`font-size: 1.5rem; margin: 0 0 0.5rem; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1rem; font-size: 0.875rem; line-height: 1.6; max-width: 820px;`;
const Table = styled.table`
  width: 100%; max-width: 900px; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
  th, td { padding: 0.55rem 0.75rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; text-align: right; vertical-align: middle; }
  th { background: #f8fafc; color: #475569; font-weight: 600; }
`;
const Key = styled.code`font-size: 0.75rem; color: #64748b; direction: ltr; display: block;`;
const Muted = styled.span`color: #64748b; font-size: 0.78rem;`;
const Cell = styled.label`display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer;`;
const Note = styled.span`color: #b45309; font-size: 0.75rem; display: block;`;
const Status = styled.p<{ $error?: boolean }>`color: ${({ $error }) => ($error ? '#b91c1c' : '#047857')}; font-size: 0.875rem; margin: 0.5rem 0;`;
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; border: none; border-radius: 8px; font-size: 0.85rem;
  cursor: pointer; background: #f1f5f9; color: #334155; margin: 1rem 0 0.5rem;
`;
const List = styled.ul`list-style: none; padding: 0; margin: 0; max-width: 900px; font-size: 0.85rem; color: #334155;
  li { padding: 0.35rem 0; border-bottom: 1px dashed #e2e8f0; }`;

const label = (p: string) => PERMISSION_LABELS[p] ?? p;
const yesNo = (v: boolean | null) => (v == null ? 'לא מוגדר' : v ? 'מותר' : 'אסור');
const when = (iso: string) => new Date(iso).toLocaleString('he-IL');

function errorText(e: unknown): string {
  const code = (e as { response?: { data?: { code?: string } } }).response?.data?.code;
  return (code && ERROR_TEXT[code]) || 'השמירה נכשלה';
}

/**
 * B10 "הרשאות לפי תפקיד": the defaults every business starts from, for managers and employees. The owner has everything
 * and isn't in the table. A business's own setting, and a member's personal one, still win — the number under a cell
 * says how many businesses set that one themselves. A change applies on the member's next request and is kept in the history.
 */
export default function RolePermissions() {
  const [matrix, setMatrix] = useState<RoleMatrix | null>(null);
  const [history, setHistory] = useState<RolePermissionChange[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const load = () => rolePermissionsApi.matrix().then(setMatrix).catch(() => setStatus({ text: 'לא הצלחתי לטעון את ההרשאות', error: true }));
  const loadHistory = () => rolePermissionsApi.history().then(setHistory).catch(() => setStatus({ text: 'לא הצלחתי לטעון את ההיסטוריה', error: true }));
  useEffect(() => { void load(); }, []);

  const toggle = async (role: TeamRole, permission: string, allowed: boolean) => {
    const verb = allowed ? 'להתיר' : 'לחסום';
    if (!window.confirm(`${verb} "${label(permission)}" ל${ROLE_LABELS[role]} בכל העסקים? עסקים שהגדירו בעצמם לא ישתנו.`)) return;
    setBusy(`${role}:${permission}`);
    setStatus(null);
    try {
      const r = await rolePermissionsApi.set(role, permission, allowed);
      setStatus({ text: r.changed ? `נשמר: ${label(permission)} — ${ROLE_LABELS[role]}: ${yesNo(allowed)}. חל מהבקשה הבאה.` : 'לא השתנה דבר.' });
      await load();
      if (history) await loadHistory();
    } catch (e) {
      setStatus({ text: errorText(e), error: true });
    } finally {
      setBusy(null);
    }
  };

  if (!matrix) return <Wrap><Title>הרשאות לפי תפקיד</Title>{status ? <Status $error role="alert">{status.text}</Status> : <Muted>טוען…</Muted>}</Wrap>;

  return (
    <Wrap>
      <Title>הרשאות לפי תפקיד</Title>
      <Desc>
        ברירת המחדל לכל העסקים: מה מנהל ומה עובד יכולים לעשות באפליקציה ובוואטסאפ. לבעלים יש הכול. עסק שהגדיר הרשאה בעצמו
        (וגם הגדרה אישית של עובד) גובר על הטבלה הזו. שינוי חל מהבקשה הבאה של העובד ונשמר בהיסטוריה.
      </Desc>
      {status && <Status $error={status.error} role={status.error ? 'alert' : 'status'}>{status.text}</Status>}
      <Table>
        <thead>
          <tr>
            <th>הרשאה</th>
            {matrix.roles.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.permissions.map((p) => (
            <tr key={p.permission}>
              <td>
                {label(p.permission)}
                <Key>{p.permission}</Key>
                {!p.grantable && <Note>רק לבעלים</Note>}
              </td>
              {matrix.roles.map((r) => {
                const c = p.roles[r];
                const name = `${label(p.permission)} ${ROLE_LABELS[r]}`;
                return (
                  <td key={r}>
                    <Cell>
                      <input
                        type="checkbox"
                        aria-label={name}
                        checked={c.allowed}
                        disabled={busy != null || (!p.grantable && !c.allowed)}
                        onChange={(e) => void toggle(r, p.permission, e.target.checked)}
                      />
                      {yesNo(c.allowed)}
                    </Cell>
                    {c.businessOverrides > 0 && <Note>{c.businessOverrides} עסקים הגדירו בעצמם</Note>}
                    {c.updatedAt && c.stored && <Muted> · {when(c.updatedAt)}</Muted>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      <Btn type="button" onClick={() => (history ? setHistory(null) : void loadHistory())}><History size={14} /> היסטוריית שינויים</Btn>
      {history && (history.length === 0
        ? <Muted>אין שינויים עדיין.</Muted>
        : (
          <List aria-label="היסטוריית שינויים">
            {history.map((h) => (
              <li key={h.id}>
                {when(h.createdAt)} · {ROLE_LABELS[h.role] ?? h.role} · {label(h.permission)}: {yesNo(h.oldAllowed)} ← {yesNo(h.newAllowed)}
                {h.actorUserId != null && <Muted> · מנהל מערכת #{h.actorUserId}</Muted>}
              </li>
            ))}
          </List>
        ))}
    </Wrap>
  );
}
