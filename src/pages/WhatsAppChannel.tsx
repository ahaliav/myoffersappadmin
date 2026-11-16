import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Save } from 'lucide-react';
import {
  waErrorText,
  whatsAppAdminApi,
  type WaBusiness,
  type WaDeadRow,
  type WaHealth,
  type WaLinkRow,
  type WaLogRow,
  type WaSettingRow,
  type WaText,
} from '../api/whatsAppAdminApi';

const Wrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`font-size: 1.5rem; margin: 0 0 0.5rem; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1rem; font-size: 0.875rem; line-height: 1.6; max-width: 860px;`;
const Tabs = styled.div`display: flex; gap: 0.25rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; flex-wrap: wrap;`;
const Tab = styled.button<{ $active: boolean }>`
  padding: 0.5rem 0.9rem; border: none; background: none; cursor: pointer; font-size: 0.9rem; font-family: inherit;
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#475569')}; border-bottom: 2px solid ${({ $active }) => ($active ? '#3b82f6' : 'transparent')};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`;
const Cards = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; max-width: 960px;`;
const Stat = styled.div<{ $tone?: 'ok' | 'bad' | 'warn' }>`
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 1rem;
  border-inline-start: 4px solid ${({ $tone }) => ($tone === 'bad' ? '#dc2626' : $tone === 'warn' ? '#d97706' : $tone === 'ok' ? '#059669' : '#e2e8f0')};
  strong { display: block; font-size: 1.25rem; color: #0f172a; }
  span { color: #64748b; font-size: 0.8rem; }
`;
const Alerts = styled.ul`background: #fef2f2; color: #991b1b; border-radius: 12px; padding: 0.75rem 1.75rem; margin: 0 0 1rem; max-width: 960px; font-size: 0.875rem;`;
const Table = styled.table`
  width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 1rem;
  th, td { padding: 0.5rem 0.65rem; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; text-align: right; vertical-align: top; }
  th { background: #f8fafc; color: #475569; font-weight: 600; white-space: nowrap; }
`;
const Code = styled.code`font-size: 0.75rem; color: #475569; direction: ltr; unicode-bidi: isolate;`;
const Muted = styled.span`color: #64748b; font-size: 0.78rem;`;
const Input = styled.input`padding: 0.35rem 0.55rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: inherit; width: 100%; min-width: 70px;`;
const Area = styled.textarea`padding: 0.35rem 0.55rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: inherit; width: 100%; min-height: 3.2rem;`;
const Select = styled.select`padding: 0.35rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; background: #fff; font-family: inherit;`;
const Row = styled.div`display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem;`;
const Btn = styled.button<{ $secondary?: boolean; $danger?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.75rem; border: none; border-radius: 8px; font-size: 0.82rem; cursor: pointer; white-space: nowrap;
  background: ${({ $secondary, $danger }) => ($danger ? '#fef2f2' : $secondary ? '#f1f5f9' : '#3b82f6')};
  color: ${({ $secondary, $danger }) => ($danger ? '#b91c1c' : $secondary ? '#334155' : '#fff')};
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Status = styled.p<{ $error?: boolean }>`color: ${({ $error }) => ($error ? '#b91c1c' : '#047857')}; font-size: 0.875rem; margin: 0.5rem 0;`;
const Scroll = styled.div`overflow-x: auto;`;

type TabKey = 'health' | 'businesses' | 'settings' | 'texts' | 'log' | 'links';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'health', label: 'מצב' },
  { key: 'businesses', label: 'עסקים' },
  { key: 'settings', label: 'הגדרות' },
  { key: 'texts', label: 'טקסטים' },
  { key: 'log', label: 'יומן הודעות' },
  { key: 'links', label: 'חיבורים' },
];

const PHASES: Record<number, string> = { 0: 'סגור', 1: '1 · שאלות', 2: '2 · עדכונים', 3: '3 · יומן', 4: '4 · הצעות והודעות' };
const ROLE_SETS: Record<string, string> = {
  'owner': 'בעלים בלבד',
  'owner,manager': 'בעלים ומנהלים',
  'owner,manager,employee': 'כולם',
};
const HEALTH: Record<string, string> = { ok: 'תקין', warning: 'אזהרה', degraded: 'תקלה' };
const LINK_STATUS: Record<string, string> = { pending: 'ממתין', linked: 'מחובר', revoked: 'בוטל' };

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('he-IL') : '—');
type Say = (text: string, error?: boolean) => void;

/**
 * "ערוץ וואטסאפ": the operator's page for the WhatsApp bot (ops runbook §5–§7). Status and dead letters, the switch,
 * stage and cap per business, the wa.* settings and texts, the message log and the phone links. Phones never appear in
 * full: a hash prefix in the log, a masked number in links. Every save applies within seconds.
 */
export default function WhatsAppChannel() {
  const [tab, setTab] = useState<TabKey>('health');
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const say: Say = useCallback((text, error) => setStatus({ text, error }), []);

  return (
    <Wrap>
      <Title>ערוץ וואטסאפ</Title>
      <Desc>
        הבוט בוואטסאפ: מצב התור וההתראות, הפעלה לפי עסק, שלב פתוח ומכסה, הגדרות וטקסטים, יומן הודעות וחיבורי טלפונים.
        המתג המהיר לכולם הוא <Code>wa.enabled_global</Code> בלשונית ההגדרות. כל שמירה חלה תוך שניות.
      </Desc>
      <Tabs role="tablist">
        {TABS.map((t) => (
          <Tab key={t.key} role="tab" aria-selected={tab === t.key} $active={tab === t.key} onClick={() => { setTab(t.key); setStatus(null); }}>
            {t.label}
          </Tab>
        ))}
      </Tabs>
      {status && <Status $error={status.error} role={status.error ? 'alert' : 'status'}>{status.text}</Status>}
      {tab === 'health' && <HealthTab say={say} />}
      {tab === 'businesses' && <BusinessesTab say={say} />}
      {tab === 'settings' && <SettingsTab say={say} />}
      {tab === 'texts' && <TextsTab say={say} />}
      {tab === 'log' && <LogTab say={say} />}
      {tab === 'links' && <LinksTab say={say} />}
    </Wrap>
  );
}

function HealthTab({ say }: { say: Say }) {
  const [health, setHealth] = useState<WaHealth | null>(null);
  const [dead, setDead] = useState<WaDeadRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, d] = await Promise.all([whatsAppAdminApi.health(), whatsAppAdminApi.dead()]);
      setHealth(h);
      setDead(d);
    } catch {
      say('לא הצלחתי לטעון את המצב', true);
    }
  }, [say]);
  useEffect(() => { void load(); }, [load]);

  const requeue = async () => {
    if (!window.confirm(`להחזיר ${dead.length} הודעות לתור? כדאי רק אחרי שתוקנה הסיבה. הבוט לא יענה פעמיים לאותה הודעה.`)) return;
    setBusy(true);
    try {
      const r = await whatsAppAdminApi.requeue();
      say(`הוחזרו לתור ${r.requeued} הודעות.`);
      await load();
    } catch {
      say('ההחזרה לתור נכשלה', true);
    } finally {
      setBusy(false);
    }
  };

  if (!health) return <Muted>טוען…</Muted>;
  const failRate = health.sentLastHour + health.failedLastHour > 0
    ? Math.round((100 * health.failedLastHour) / (health.sentLastHour + health.failedLastHour)) : 0;

  return (
    <>
      <Row><Btn $secondary type="button" onClick={() => void load()}><RefreshCw size={14} /> רענון</Btn></Row>
      {health.alerts.length > 0 && <Alerts aria-label="התראות">{health.alerts.map((a) => <li key={a}>{a}</li>)}</Alerts>}
      <Cards>
        <Stat $tone={health.status === 'ok' ? 'ok' : health.status === 'warning' ? 'warn' : 'bad'}><strong>{HEALTH[health.status] ?? health.status}</strong><span>מצב כללי</span></Stat>
        <Stat $tone={health.enabled ? 'ok' : 'warn'}><strong>{health.enabled ? 'פועל' : 'כבוי'}</strong><span>הערוץ (WhatsApp__Enabled)</span></Stat>
        <Stat $tone={health.canReceive ? 'ok' : 'bad'}><strong>{health.canReceive ? 'כן' : 'לא'}</strong><span>יכול לקבל (סוד האפליקציה)</span></Stat>
        <Stat $tone={health.canSend ? 'ok' : 'bad'}><strong>{health.canSend ? 'כן' : 'לא'}</strong><span>יכול לשלוח (טוקן ומספר)</span></Stat>
        <Stat $tone={health.queue.queued > 0 ? 'warn' : undefined}><strong>{health.queue.queued}</strong><span>בתור · הוותיקה מ-{when(health.queue.oldestQueuedAt)}</span></Stat>
        <Stat><strong>{health.queue.processing}</strong><span>בטיפול</span></Stat>
        <Stat $tone={health.queue.dead > 0 ? 'bad' : undefined}><strong>{health.queue.dead}</strong><span>נכשלו סופית</span></Stat>
        <Stat><strong>{health.inboundLastHour}</strong><span>נכנסו בשעה האחרונה</span></Stat>
        <Stat $tone={failRate > 20 ? 'bad' : undefined}><strong>{health.sentLastHour} / {health.failedLastHour}</strong><span>נשלחו / נכשלו בשעה האחרונה</span></Stat>
        <Stat><strong>{when(health.queue.lastReceivedAt)}</strong><span>הודעה אחרונה שהתקבלה</span></Stat>
      </Cards>
      {Object.keys(health.counters).length > 0 && (
        <Table aria-label="מונים">
          <thead><tr><th>מונה</th><th>ערך</th></tr></thead>
          <tbody>{Object.entries(health.counters).map(([k, v]) => <tr key={k}><td><Code>{k}</Code></td><td>{v}</td></tr>)}</tbody>
        </Table>
      )}
      <h3>הודעות שנכשלו סופית</h3>
      {dead.length === 0 ? <Muted>אין.</Muted> : (
        <>
          <Row><Btn type="button" disabled={busy} onClick={() => void requeue()}>החזר הכול לתור</Btn></Row>
          <Scroll><Table aria-label="הודעות שנכשלו">
            <thead><tr><th>#</th><th>סוג</th><th>התקבלה</th><th>ניסיונות</th><th>שגיאה אחרונה</th></tr></thead>
            <tbody>{dead.map((d) => <tr key={d.id}><td>{d.id}</td><td>{d.type}</td><td>{when(d.receivedAt)}</td><td>{d.attempts}</td><td><Code>{d.lastError ?? ''}</Code></td></tr>)}</tbody>
          </Table></Scroll>
        </>
      )}
    </>
  );
}

function BusinessesTab({ say }: { say: Say }) {
  const [rows, setRows] = useState<WaBusiness[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback((query?: string) => whatsAppAdminApi.businesses(query).then(setRows).catch(() => say('לא הצלחתי לטעון את העסקים', true)), [say]);
  useEffect(() => { void load(); }, [load]);

  const save = async (b: WaBusiness, patch: Parameters<typeof whatsAppAdminApi.setBusiness>[1], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(b.id);
    try {
      await whatsAppAdminApi.setBusiness(b.id, patch);
      say(`נשמר: עסק #${b.id}.`);
      await load(q);
    } catch (e) {
      say(waErrorText(e), true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Row>
        <Input style={{ maxWidth: 260 }} aria-label="חיפוש עסק" placeholder="מספר עסק או חלק מהשם" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void load(q); }} />
        <Btn $secondary type="button" onClick={() => void load(q)}>חיפוש</Btn>
        <Muted>עסקים שהוגדרו מופיעים ראשונים. עסק שלא הוגדר כבוי.</Muted>
      </Row>
      {!rows ? <Muted>טוען…</Muted> : rows.length === 0 ? <Muted>לא נמצאו עסקים.</Muted> : (
        <Scroll><Table aria-label="עסקים">
          <thead><tr><th>עסק</th><th>פעיל</th><th>בטא</th><th>שלב פתוח</th><th>מכסה יומית לחבר</th><th>מי יכול להתחבר</th><th>טלפונים מחוברים</th><th>עודכן</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>#{b.id} {b.name ?? <Muted>ללא שם</Muted>}{!b.configured && <><br /><Muted>לא הוגדר</Muted></>}</td>
                <td>
                  <input type="checkbox" aria-label={`פעיל ${b.id}`} checked={b.enabled} disabled={busy != null}
                    onChange={(e) => void save(b, { enabled: e.target.checked }, e.target.checked ? undefined : `לכבות את הבוט לעסק #${b.id}? חברי העסק יקבלו "הבוט לא פעיל" עם קישור לאפליקציה.`)} />
                </td>
                <td><input type="checkbox" aria-label={`בטא ${b.id}`} checked={b.beta} disabled={busy != null} onChange={(e) => void save(b, { beta: e.target.checked })} /></td>
                <td>
                  <Select aria-label={`שלב ${b.id}`} value={b.phaseActive ?? ''} disabled={busy != null}
                    onChange={(e) => e.target.value !== '' && void save(b, { phaseActive: Number(e.target.value) })}>
                    {b.phaseActive == null && <option value="">לפי ההגדרה הכללית</option>}
                    {Object.entries(PHASES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </td>
                <td><CapEditor key={`${b.id}-${b.dailyMessagesCap}`} b={b} disabled={busy != null} onSave={(cap) => void save(b, { dailyMessagesCap: cap })} /></td>
                <td>
                  <Select aria-label={`תפקידים ${b.id}`} value={b.roles} disabled={busy != null}
                    onChange={(e) => void save(b, { roles: e.target.value }, ROLE_SETS[e.target.value] !== 'כולם' ? 'מי שהתפקיד שלו יורד מהרשימה ינותק מוואטסאפ מיד. להמשיך?' : undefined)}>
                    {!ROLE_SETS[b.roles] && <option value={b.roles}>{b.roles}</option>}
                    {Object.entries(ROLE_SETS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </td>
                <td>{b.links}</td>
                <td><Muted>{when(b.updatedAt)}</Muted></td>
              </tr>
            ))}
          </tbody>
        </Table></Scroll>
      )}
    </>
  );
}

function CapEditor({ b, disabled, onSave }: { b: WaBusiness; disabled: boolean; onSave: (cap: number) => void }) {
  const [value, setValue] = useState(b.dailyMessagesCap?.toString() ?? '');
  const n = Number(value);
  const valid = value !== '' && Number.isInteger(n) && n > 0 && n <= 10000 && n !== b.dailyMessagesCap;
  return (
    <Row style={{ margin: 0, flexWrap: 'nowrap' }}>
      <Input aria-label={`מכסה ${b.id}`} inputMode="numeric" style={{ width: 80 }} placeholder="כללי" value={value} onChange={(e) => setValue(e.target.value)} />
      <Btn $secondary type="button" aria-label={`שמור מכסה ${b.id}`} disabled={disabled || !valid} onClick={() => onSave(n)}><Save size={13} /></Btn>
    </Row>
  );
}

function SettingsTab({ say }: { say: Say }) {
  const [rows, setRows] = useState<WaSettingRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => whatsAppAdminApi.settings().then((d) => { setRows(d.rows); setDraft({}); }).catch(() => say('לא הצלחתי לטעון את ההגדרות', true)), [say]);
  useEffect(() => { void load(); }, [load]);

  const save = async (key: string, value: string) => {
    if (key === 'wa.enabled_global' && value === 'false' && !window.confirm('לכבות את הבוט לכל העסקים?')) return;
    if (key === 'wa.enabled_global' && value === 'true' && !window.confirm('להדליק את הבוט? הוא יענה לעסקים שמופעלים (ובבטא, אם wa.beta_only דולק).')) return;
    setBusy(true);
    try {
      await whatsAppAdminApi.setSetting(key, value);
      say(`נשמר: ${key} = ${value}`);
      await load();
    } catch (e) {
      say(waErrorText(e), true);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Muted>טוען…</Muted>;
  return (
    <Scroll><Table aria-label="הגדרות">
      <thead><tr><th>מפתח</th><th>ערך</th><th>תיאור</th><th>עודכן</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const isBool = r.value === 'true' || r.value === 'false';
          const value = draft[r.key] ?? r.value;
          return (
            <tr key={r.key}>
              <td><Code>{r.key}</Code></td>
              <td style={{ minWidth: 190 }}>
                {isBool ? (
                  <label><input type="checkbox" aria-label={r.key} checked={r.value === 'true'} disabled={busy} onChange={(e) => void save(r.key, String(e.target.checked))} /> {r.value === 'true' ? 'כן' : 'לא'}</label>
                ) : (
                  <Row style={{ margin: 0, flexWrap: 'nowrap' }}>
                    <Input aria-label={r.key} value={value} onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))} />
                    <Btn type="button" aria-label={`שמור ${r.key}`} disabled={busy || value.trim() === r.value || value.trim() === ''} onClick={() => void save(r.key, value.trim())}><Save size={13} /></Btn>
                  </Row>
                )}
              </td>
              <td><Muted>{r.description ?? ''}</Muted></td>
              <td><Muted>{when(r.updatedAt)}{r.updatedBy ? ` · ${r.updatedBy}` : ''}</Muted></td>
            </tr>
          );
        })}
      </tbody>
    </Table></Scroll>
  );
}

function TextsTab({ say }: { say: Say }) {
  const [rows, setRows] = useState<WaText[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => whatsAppAdminApi.texts().then((d) => { setRows(d); setDraft({}); }).catch(() => say('לא הצלחתי לטעון את הטקסטים', true)), [say]);
  useEffect(() => { void load(); }, [load]);

  const save = async (key: string, text: string) => {
    setBusy(true);
    try {
      await whatsAppAdminApi.setText(key, text);
      say(`נשמר: ${key}`);
      await load();
    } catch (e) {
      say(waErrorText(e), true);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Muted>טוען…</Muted>;
  const f = filter.trim().toLowerCase();
  const shown = f ? rows.filter((r) => r.key.toLowerCase().includes(f) || r.textHe.includes(filter.trim())) : rows;
  return (
    <>
      <Row>
        <Input style={{ maxWidth: 260 }} aria-label="סינון טקסטים" placeholder="סינון לפי מפתח או טקסט" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <Muted>כפתורים (<Code>wa.buttons.*</Code>) עד 20 תווים.</Muted>
      </Row>
      <Scroll><Table aria-label="טקסטים">
        <thead><tr><th>מפתח</th><th>טקסט</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => {
            const value = draft[r.key] ?? r.textHe;
            const button = r.key.startsWith('wa.buttons.');
            const tooLong = button && value.trim().length > 20;
            return (
              <tr key={r.key}>
                <td style={{ width: '22%' }}><Code>{r.key}</Code>{r.description && <><br /><Muted>{r.description}</Muted></>}</td>
                <td>
                  {button
                    ? <Input aria-label={r.key} value={value} onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))} />
                    : <Area aria-label={r.key} value={value} onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))} />}
                  {tooLong && <Status $error>{value.trim().length} / 20</Status>}
                </td>
                <td>
                  <Btn type="button" aria-label={`שמור ${r.key}`} disabled={busy || tooLong || value.trim() === '' || value === r.textHe} onClick={() => void save(r.key, value)}>
                    <Save size={13} /> שמירה
                  </Btn>
                  <br /><Muted>{when(r.updatedAt)}</Muted>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table></Scroll>
    </>
  );
}

function LogTab({ say }: { say: Say }) {
  const [rows, setRows] = useState<WaLogRow[] | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [outcome, setOutcome] = useState('');

  const load = useCallback((biz: string, out: string) =>
    whatsAppAdminApi.log({ businessId: biz ? Number(biz) : undefined, outcome: out || undefined, take: 200 })
      .then(setRows).catch(() => say('לא הצלחתי לטעון את היומן', true)), [say]);
  useEffect(() => { void load('', ''); }, [load]);

  return (
    <>
      <Row>
        <Input style={{ maxWidth: 140 }} aria-label="מספר עסק" inputMode="numeric" placeholder="מספר עסק" value={businessId} onChange={(e) => setBusinessId(e.target.value.replace(/\D/g, ''))} />
        <Input style={{ maxWidth: 180 }} aria-label="תוצאה" placeholder="תוצאה (למשל denied)" value={outcome} onChange={(e) => setOutcome(e.target.value.trim())} />
        <Btn $secondary type="button" onClick={() => void load(businessId, outcome)}><RefreshCw size={14} /> הצג</Btn>
        <Muted>200 האחרונות. טלפון מוצג כתחילת גיבוב בלבד.</Muted>
      </Row>
      {!rows ? <Muted>טוען…</Muted> : rows.length === 0 ? <Muted>אין הודעות.</Muted> : (
        <Scroll><Table aria-label="יומן הודעות">
          <thead><tr><th>זמן</th><th>כיוון</th><th>עסק / חבר</th><th>סוג</th><th>טקסט</th><th>כוונה</th><th>תוצאה</th><th>שגיאה</th><th>טלפון</th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td><Muted>{when(l.createdAt)}</Muted></td>
                <td>{l.direction === 'in' ? 'נכנסת' : 'יוצאת'}</td>
                <td>{l.businessId ?? '—'} / {l.userId ?? '—'}</td>
                <td>{l.type}</td>
                <td style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{l.text ?? ''}{l.transcript && <><br /><Muted>תמלול: {l.transcript}</Muted></>}</td>
                <td>{l.intent ?? ''}</td>
                <td>{l.outcome ?? l.status ?? ''}</td>
                <td><Code>{l.error ?? ''}</Code></td>
                <td><Code>{l.phone}</Code></td>
              </tr>
            ))}
          </tbody>
        </Table></Scroll>
      )}
    </>
  );
}

function LinksTab({ say }: { say: Say }) {
  const [rows, setRows] = useState<WaLinkRow[] | null>(null);
  const [businessId, setBusinessId] = useState('');

  const load = useCallback((biz: string) =>
    whatsAppAdminApi.links(biz ? Number(biz) : undefined).then(setRows).catch(() => say('לא הצלחתי לטעון את החיבורים', true)), [say]);
  useEffect(() => { void load(''); }, [load]);

  return (
    <>
      <Row>
        <Input style={{ maxWidth: 140 }} aria-label="מספר עסק לחיבורים" inputMode="numeric" placeholder="מספר עסק" value={businessId} onChange={(e) => setBusinessId(e.target.value.replace(/\D/g, ''))} />
        <Btn $secondary type="button" onClick={() => void load(businessId)}><RefreshCw size={14} /> הצג</Btn>
        <Muted>ניתוק חבר נעשה מהעסק עצמו (מסך הצוות) או בכיבוי העסק כאן.</Muted>
      </Row>
      {!rows ? <Muted>טוען…</Muted> : rows.length === 0 ? <Muted>אין חיבורים.</Muted> : (
        <Scroll><Table aria-label="חיבורים">
          <thead><tr><th>#</th><th>עסק</th><th>חבר</th><th>טלפון</th><th>מצב</th><th>חובר</th><th>הודעה אחרונה</th><th>בוטל</th><th>הסכמה</th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.businessId}</td>
                <td>{l.userId}</td>
                <td><Code>{l.phone}</Code></td>
                <td>{LINK_STATUS[l.status] ?? l.status}</td>
                <td><Muted>{when(l.linkedAt)}</Muted></td>
                <td><Muted>{when(l.lastInboundAt)}</Muted></td>
                <td><Muted>{l.revokedAt ? `${when(l.revokedAt)} · ${l.revokeReason ?? ''}` : '—'}</Muted></td>
                <td><Code>{l.consentVersion ?? ''}</Code></td>
              </tr>
            ))}
          </tbody>
        </Table></Scroll>
      )}
    </>
  );
}
