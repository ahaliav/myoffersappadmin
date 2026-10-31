import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminApi } from '../api/adminApi';
import type { AdminCreateUserRequest, AdminUser } from '../api/adminApi';
import { toAuthError } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, Mail, Pencil, RefreshCw, Shield, User, UserPlus, Ban, CheckCircle2 } from 'lucide-react';

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const Btn = styled.button<{ $secondary?: boolean; $danger?: boolean; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: ${(p) => (p.$small ? '0.35rem 0.65rem' : '0.5rem 1rem')};
  background: ${(p) => (p.$danger ? '#dc2626' : p.$secondary ? '#ffffff' : '#3b82f6')};
  color: ${(p) => (p.$secondary ? '#334155' : 'white')};
  border: 1px solid ${(p) => (p.$danger ? '#dc2626' : p.$secondary ? '#e2e8f0' : '#3b82f6')};
  border-radius: 8px;
  font-size: ${(p) => (p.$small ? '0.8125rem' : '0.875rem')};
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$danger ? '#b91c1c' : p.$secondary ? '#f8fafc' : '#2563eb')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Search = styled.input`
  flex: 1;
  min-width: 200px;
  max-width: 360px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
`;

const Panel = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem 1rem;
  align-items: end;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #334155;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Check = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: #334155;
`;

const PanelActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 0.5rem;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
`;

const UserCard = styled.div<{ $disabled?: boolean }>`
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  opacity: ${(p) => (p.$disabled ? 0.65 : 1)};
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const Avatar = styled.div<{ $admin?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${(p) =>
    p.$admin ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
`;

const Email = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  direction: ltr;
  text-align: right;
  overflow-wrap: anywhere;
`;

const Meta = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.5rem;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const Badge = styled.span<{ $tone: 'blue' | 'green' | 'amber' | 'red' | 'gray' }>`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  ${(p) =>
    ({
      blue: 'background:#dbeafe;color:#1d4ed8;',
      green: 'background:#dcfce7;color:#15803d;',
      amber: 'background:#fef3c7;color:#b45309;',
      red: 'background:#fee2e2;color:#b91c1c;',
      gray: 'background:#f1f5f9;color:#475569;',
    })[p.$tone]}
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const Message = styled.p<{ $error?: boolean }>`
  color: ${(p) => (p.$error ? '#dc2626' : '#15803d')};
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
`;

const Empty = styled.p`
  color: #64748b;
  margin: 2rem 0 0 0;
`;

const ERROR_TEXT: Record<string, string> = {
  email_taken: 'כבר יש משתמש עם המייל הזה',
  invalid_email: 'כתובת מייל לא תקינה',
  invalid_name: 'צריך שם מלא',
  weak_password: 'הסיסמה צריכה להיות באורך 8 תווים לפחות',
  cannot_change_self: 'אי אפשר להסיר את הרשאת הניהול שלך או להשבית את החשבון שלך',
  email_not_configured: 'שליחת מיילים לא מוגדרת בשרת',
  too_soon: 'נשלח קישור לפני פחות מדקה',
  account_disabled: 'החשבון מושבת',
};

const emptyCreate: AdminCreateUserRequest = { fullName: '', email: '', isAdmin: false, password: '', sendPasswordLink: true };

type EditForm = { fullName: string; email: string; isAdmin: boolean };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<AdminCreateUserRequest>(emptyCreate);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ fullName: '', email: '', isAdmin: false });
  const [passwordId, setPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (key: string, action: () => Promise<string | void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const done = await action();
      if (done) setNotice(done);
    } catch (e: unknown) {
      const info = toAuthError(e);
      setError(ERROR_TEXT[info.code] ?? info.message);
    } finally {
      setBusy(null);
    }
  };

  const replace = (updated: AdminUser) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const withoutPassword = users.filter((u) => !u.hasPassword && !u.disabled).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return s;
    }
  };

  const create = () =>
    run('create', async () => {
      const password = createForm.password?.trim() ? createForm.password : undefined;
      const res = await adminApi.createUser({ ...createForm, password, sendPasswordLink: !password && createForm.sendPasswordLink });
      setUsers((prev) => [res.data, ...prev]);
      setCreateForm(emptyCreate);
      setShowCreate(false);
      return password || !createForm.sendPasswordLink
        ? `המשתמש ${res.data.email} נוצר`
        : `המשתמש ${res.data.email} נוצר ונשלח אליו מייל לבחירת סיסמה`;
    });

  const startEdit = (u: AdminUser) => {
    setPasswordId(null);
    setEditId(u.id);
    setEditForm({ fullName: u.fullName, email: u.email, isAdmin: u.isAdmin });
  };

  const saveEdit = (u: AdminUser) =>
    run(`edit-${u.id}`, async () => {
      const res = await adminApi.updateUser(u.id, {
        fullName: editForm.fullName !== u.fullName ? editForm.fullName : undefined,
        email: editForm.email !== u.email ? editForm.email : undefined,
        isAdmin: editForm.isAdmin !== u.isAdmin ? editForm.isAdmin : undefined,
      });
      replace(res.data);
      setEditId(null);
      return 'נשמר';
    });

  const toggleDisabled = (u: AdminUser) => {
    const question = u.disabled
      ? `להפעיל מחדש את ${u.email}?`
      : `להשבית את ${u.email}? המשתמש לא יוכל להתחבר והחיבורים הפתוחים שלו ייסגרו. הנתונים שלו נשמרים.`;
    if (!window.confirm(question)) return;
    void run(`disable-${u.id}`, async () => {
      replace((await adminApi.updateUser(u.id, { disabled: !u.disabled })).data);
      return u.disabled ? 'המשתמש הופעל מחדש' : 'המשתמש הושבת';
    });
  };

  const sendLink = (u: AdminUser) =>
    run(`link-${u.id}`, async () => {
      await adminApi.sendPasswordLink(u.id);
      return `נשלח מייל לבחירת סיסמה אל ${u.email}`;
    });

  const savePassword = (u: AdminUser) =>
    run(`password-${u.id}`, async () => {
      replace((await adminApi.setUserPassword(u.id, newPassword)).data);
      setPasswordId(null);
      setNewPassword('');
      return `הסיסמה של ${u.email} עודכנה. החיבורים הפתוחים שלו נסגרו.`;
    });

  const sendAll = () => {
    if (!window.confirm(`לשלוח מייל לבחירת סיסמה ל-${withoutPassword} משתמשים שאין להם סיסמה?`)) return;
    void run('all', async () => {
      const r = (await adminApi.sendPasswordLinksToAll()).data;
      return `נשלחו ${r.sent} מיילים${r.skipped ? `, ${r.skipped} דולגו (נשלח להם קישור בדקה האחרונה)` : ''}${r.failed ? `, ${r.failed} נכשלו` : ''}`;
    });
  };

  return (
    <>
      <Title>משתמשים</Title>
      <Toolbar>
        <Btn onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={16} />
          משתמש חדש
        </Btn>
        <Btn $secondary onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          רענן
        </Btn>
        {withoutPassword > 0 && (
          <Btn $secondary onClick={sendAll} disabled={busy !== null} title="משתמשים שעברו מהמערכת הקודמת ועדיין אין להם סיסמה">
            <Mail size={16} />
            מייל לבחירת סיסמה ל-{withoutPassword} בלי סיסמה
          </Btn>
        )}
        <Search placeholder="חיפוש לפי שם או מייל" value={query} onChange={(e) => setQuery(e.target.value)} />
      </Toolbar>

      {showCreate && (
        <Panel>
          <Field>
            שם מלא
            <Input value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
          </Field>
          <Field>
            מייל
            <Input
              type="email"
              dir="ltr"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
          </Field>
          <Field>
            סיסמה (לא חובה)
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="בלי סיסמה – נשלח מייל"
              value={createForm.password ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
          </Field>
          <div>
            <Check>
              <input
                type="checkbox"
                checked={createForm.isAdmin}
                onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
              />
              מנהל
            </Check>
            <br />
            <Check>
              <input
                type="checkbox"
                disabled={Boolean(createForm.password)}
                checked={!createForm.password && createForm.sendPasswordLink}
                onChange={(e) => setCreateForm({ ...createForm, sendPasswordLink: e.target.checked })}
              />
              שליחת מייל לבחירת סיסמה
            </Check>
          </div>
          <PanelActions>
            <Btn onClick={create} disabled={busy === 'create' || !createForm.email.trim() || !createForm.fullName.trim()}>
              {busy === 'create' ? 'יוצר...' : 'יצירה'}
            </Btn>
            <Btn $secondary onClick={() => setShowCreate(false)}>
              ביטול
            </Btn>
          </PanelActions>
        </Panel>
      )}

      {error && <Message $error>{error}</Message>}
      {notice && <Message>{notice}</Message>}

      {loading && users.length === 0 ? (
        <p style={{ color: '#64748b' }}>טוען...</p>
      ) : visible.length === 0 ? (
        <Empty>אין משתמשים להצגה.</Empty>
      ) : (
        <CardGrid>
          {visible.map((u) => {
            const self = me?.id === u.id;
            return (
              <UserCard key={u.id} $disabled={u.disabled}>
                <CardTop>
                  <Avatar $admin={u.isAdmin}>{u.isAdmin ? <Shield size={22} /> : <User size={22} />}</Avatar>
                  <Info>
                    <Name>
                      {u.fullName || 'ללא שם'}
                      {self && ' (את/ה)'}
                    </Name>
                    <Email>{u.email}</Email>
                    <Meta>נרשם: {formatDate(u.createdAt)}</Meta>
                  </Info>
                </CardTop>
                <Badges>
                  {u.isAdmin && <Badge $tone="amber">מנהל</Badge>}
                  {u.disabled && <Badge $tone="red">מושבת</Badge>}
                  {u.hasPassword ? <Badge $tone="blue">סיסמה</Badge> : <Badge $tone="gray">אין סיסמה</Badge>}
                  {u.hasGoogle && <Badge $tone="blue">Google</Badge>}
                  {u.emailVerified ? <Badge $tone="green">מייל מאומת</Badge> : <Badge $tone="gray">מייל לא מאומת</Badge>}
                </Badges>

                {editId === u.id ? (
                  <Panel style={{ margin: 0, padding: '0.75rem' }}>
                    <Field>
                      שם מלא
                      <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
                    </Field>
                    <Field>
                      מייל
                      <Input dir="ltr" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </Field>
                    <Check>
                      <input
                        type="checkbox"
                        checked={editForm.isAdmin}
                        disabled={self}
                        onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                      />
                      מנהל
                    </Check>
                    <PanelActions>
                      <Btn $small onClick={() => saveEdit(u)} disabled={busy === `edit-${u.id}`}>
                        שמירה
                      </Btn>
                      <Btn $small $secondary onClick={() => setEditId(null)}>
                        ביטול
                      </Btn>
                    </PanelActions>
                  </Panel>
                ) : passwordId === u.id ? (
                  <Panel style={{ margin: 0, padding: '0.75rem' }}>
                    <Field>
                      סיסמה חדשה
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </Field>
                    <PanelActions>
                      <Btn $small onClick={() => savePassword(u)} disabled={busy === `password-${u.id}` || newPassword.length < 8}>
                        קביעת סיסמה
                      </Btn>
                      <Btn
                        $small
                        $secondary
                        onClick={() => {
                          setPasswordId(null);
                          setNewPassword('');
                        }}
                      >
                        ביטול
                      </Btn>
                    </PanelActions>
                  </Panel>
                ) : (
                  <Actions>
                    <Btn $small $secondary onClick={() => startEdit(u)}>
                      <Pencil size={14} />
                      עריכה
                    </Btn>
                    <Btn $small $secondary onClick={() => sendLink(u)} disabled={u.disabled || busy === `link-${u.id}`}>
                      <Mail size={14} />
                      מייל לבחירת סיסמה
                    </Btn>
                    <Btn
                      $small
                      $secondary
                      onClick={() => {
                        setEditId(null);
                        setNewPassword('');
                        setPasswordId(u.id);
                      }}
                    >
                      <KeyRound size={14} />
                      קביעת סיסמה
                    </Btn>
                    {!self && (
                      <Btn
                        $small
                        $secondary={u.disabled}
                        $danger={!u.disabled}
                        onClick={() => toggleDisabled(u)}
                        disabled={busy === `disable-${u.id}`}
                      >
                        {u.disabled ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                        {u.disabled ? 'הפעלה' : 'השבתה'}
                      </Btn>
                    )}
                  </Actions>
                )}
              </UserCard>
            );
          })}
        </CardGrid>
      )}
    </>
  );
}
