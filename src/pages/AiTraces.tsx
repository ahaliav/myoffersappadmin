import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Trash2, X } from 'lucide-react';
import {
  aiTracesApi,
  type AiTraceFilters,
  type AiTraceFull,
  type AiTraceList,
  type AiTraceRelated,
  type AiTraceSettings,
} from '../api/aiTracesApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.25rem; font-size: 0.875rem; line-height: 1.6;`;
const Card = styled.div`background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;`;
const Row = styled.div`display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap;`;
const Label = styled.label`display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #475569;`;
const Input = styled.input`padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; min-width: 0;`;
const Select = styled.select`padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; background: #fff;`;
const Btn = styled.button<{ $secondary?: boolean; $danger?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; border: 1px solid ${({ $secondary, $danger }) => ($danger ? '#fecaca' : $secondary ? '#cbd5e1' : '#2563eb')};
  background: ${({ $secondary, $danger }) => ($danger ? '#fef2f2' : $secondary ? '#fff' : '#2563eb')};
  color: ${({ $secondary, $danger }) => ($danger ? '#b91c1c' : $secondary ? '#334155' : '#fff')};
  &:disabled { opacity: 0.5; cursor: default; }
`;
const Muted = styled.span`color: #64748b; font-size: 0.8rem;`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.875rem;`;
const Layout = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: start;
  @media (max-width: 1200px) { grid-template-columns: 1fr; }`;
const Table = styled.table`width: 100%; border-collapse: collapse; font-size: 0.8rem;
  th, td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: top; }
  th { color: #475569; font-weight: 600; background: #f8fafc; position: sticky; top: 0; }`;
const TRow = styled.tr<{ $active: boolean; $guard: boolean }>`
  cursor: pointer; background: ${({ $active, $guard }) => ($active ? '#eff6ff' : $guard ? '#fffbeb' : 'transparent')};
  &:hover { background: #f1f5f9; }
`;
const Badge = styled.span<{ $tone: 'ok' | 'bad' | 'warn' | 'info' }>`
  display: inline-block; padding: 0.1rem 0.45rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; white-space: nowrap;
  background: ${({ $tone }) => ({ ok: '#dcfce7', bad: '#fee2e2', warn: '#fef3c7', info: '#e0e7ff' }[$tone])};
  color: ${({ $tone }) => ({ ok: '#166534', bad: '#991b1b', warn: '#92400e', info: '#3730a3' }[$tone])};
`;
const Pre = styled.pre`white-space: pre-wrap; word-break: break-word; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 0.6rem; font-size: 0.78rem; max-height: 420px; overflow: auto; margin: 0.25rem 0 0.75rem; unicode-bidi: plaintext;`;
const H3 = styled.h3`margin: 0.75rem 0 0.25rem; font-size: 0.9rem; color: #0f172a;`;
const Meta = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.25rem 1rem; font-size: 0.8rem; color: #334155;`;
const Preview = styled.span`color: #64748b; display: inline-block; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; unicode-bidi: plaintext;`;

const OUTCOMES: Record<string, string> = { success: 'הצליח', kept_all: 'השומר לא הוריד', removed: 'השומר הוריד', length: 'נקטע (אורך)' };

function message(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'שגיאה';
}

function tone(outcome: string): 'ok' | 'bad' | 'warn' | 'info' {
  if (outcome === 'success' || outcome === 'kept_all') return 'ok';
  if (outcome === 'removed' || outcome === 'length') return 'warn';
  return 'bad';
}

const time = (iso: string) => new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'medium' });
const usd = (v: number | null) => (v == null ? '—' : `$${v < 0.01 ? v.toFixed(5) : v.toFixed(4)}`);

/** The switch, how long traces are kept, and how many there are now. */
function SettingsCard({ onChanged }: { onChanged: () => void }) {
  const [s, setS] = useState<AiTraceSettings | null>(null);
  const [value, setValue] = useState('');
  const [days, setDays] = useState('14');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await aiTracesApi.settings();
      setS(data);
      setValue(data.value);
      setDays(String(data.retentionDays));
    } catch (e) { setError(message(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try { await aiTracesApi.setSettings(value.trim(), Number(days)); await load(); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };

  const clearAll = async () => {
    if (!window.confirm('למחוק את כל הקריאות השמורות?')) return;
    setBusy(true);
    try { await aiTracesApi.removeBefore(); await load(); onChanged(); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };

  if (!s) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  const on = s.value !== 'off';
  return (
    <Card aria-label="הגדרות מעקב">
      <Row>
        <Label>
          מעקב (off / on / users:12,34)
          <Input dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} aria-label="ai_trace" style={{ width: 200 }} />
        </Label>
        <Label>
          ימים לשמירה (1–90)
          <Input type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} aria-label="ai_trace_retention_days" style={{ width: 90 }} />
        </Label>
        <Btn type="button" onClick={() => void save()} disabled={busy || (value.trim() === s.value && Number(days) === s.retentionDays)}>שמירה</Btn>
        <Badge $tone={on ? 'ok' : 'info'}>{on ? 'פועל' : 'כבוי'}</Badge>
        <Muted>
          {s.count} קריאות שמורות{s.oldest ? ` · הישנה מ-${time(s.oldest)}` : ''}{s.updatedBy ? ` · שונה ע"י ${s.updatedBy}` : ''}
        </Muted>
        <span style={{ flex: 1 }} />
        <Btn type="button" $danger onClick={() => void clearAll()} disabled={busy || s.count === 0}><Trash2 size={14} />מחיקת הכל</Btn>
      </Row>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <Muted>
        כשהמעקב פועל נשמרים הפרומפט והתשובה המלאים (כולל פרטי לקוחות שהמשתמש כתב), לכן כדאי להפעיל למשתמשים מסוימים ולזמן קצר. קבצים ותמונות לא נשמרים, רק הסוג והגודל.
      </Muted>
    </Card>
  );
}

interface RequestJson {
  jsonOutput?: boolean;
  maxOutputTokens?: number | null;
  tools?: string[];
  messages?: { role: string; text: string | null; attachments?: { mime: string; size: number; name?: string | null }[]; toolCalls?: { name: string; args: string }[]; toolCallId?: string | null }[];
  audio?: string;
}

interface GuardDetails {
  correction?: boolean;
  numbers?: string[];
  units?: number;
  validity?: number | null;
  descriptions?: { item: string; line: string; kept: boolean; reason: string; saidPct: number; unsaid: string[] }[];
  /** A3: the operations the edit prompt returned and what the code did with each. */
  edit?: { op: string; applied: boolean; reason: string; detail?: string | null }[];
  question?: string | null;
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

const REASONS: Record<string, string> = { ok: 'נאמר', number: 'מספר שלא נאמר', brand: 'מותג / מילה לועזית שלא נאמרה', words: 'רוב המילים לא נאמרו' };

const EDIT_REASONS: Record<string, string> = {
  ok: 'בוצע', no_place: 'לא נמצא המקום', no_remove_word: 'לא נאמרה מילת הסרה', same_place: 'כבר במקום',
  empty: 'ריק', nothing_said: 'אין שינוי שנאמר', unsaid_line: 'שורה שלא נאמרה', unsaid_name: 'שם שלא נאמר',
  unsaid_note: 'הערה שלא נאמרה', unsaid_title: 'כותרת שלא נאמרה', unknown: 'פעולה לא מוכרת', not_allowed: 'פעולה כבויה בהגדרות',
};

function EditView({ details }: { details: GuardDetails }) {
  const ops = details.edit ?? [];
  return (
    <>
      <H3>פעולות התיקון</H3>
      {details.question && <Meta><span>שאלה ללקוח: {details.question}</span></Meta>}
      {ops.length === 0 ? <Muted>לא הוחזרו פעולות</Muted> : (
        <Table style={{ marginTop: '0.5rem' }}>
          <thead><tr><th>פעולה</th><th>החלטה</th><th>פרט</th></tr></thead>
          <tbody>
            {ops.map((o, i) => (
              <tr key={i}>
                <td dir="ltr">{o.op}</td>
                <td><Badge $tone={o.applied ? 'ok' : 'warn'}>{o.applied ? 'בוצע' : 'לא בוצע'}</Badge> <Muted>{EDIT_REASONS[o.reason.split(':')[0]] ?? o.reason}</Muted></td>
                <td>{o.detail}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

function GuardView({ details }: { details: GuardDetails }) {
  if (details.edit) return <EditView details={details} />;
  const descriptions = details.descriptions ?? [];
  return (
    <>
      <H3>מה השומר בדק</H3>
      <Meta>
        <span>מספרים שהורדו: {details.numbers?.length ? details.numbers.join(' · ') : 'אין'}</span>
        <span>יחידות שהורדו: {details.units ?? 0}</span>
        <span>תוקף שהורד: {details.validity != null ? `${details.validity} ימים` : 'אין'}</span>
        <span>{details.correction ? 'תיקון של הצעה קיימת' : 'הודעה חדשה'}</span>
      </Meta>
      {descriptions.length > 0 && (
        <Table style={{ marginTop: '0.5rem' }}>
          <thead><tr><th>פריט</th><th>שורת תיאור</th><th>החלטה</th><th>% נאמר</th><th>מילים שלא נאמרו</th></tr></thead>
          <tbody>
            {descriptions.map((d, i) => (
              <tr key={i}>
                <td>{d.item}</td>
                <td>{d.line}</td>
                <td><Badge $tone={d.kept ? 'ok' : 'warn'}>{d.kept ? 'נשאר' : 'הורד'}</Badge> <Muted>{REASONS[d.reason] ?? d.reason}</Muted></td>
                <td>{d.saidPct}%</td>
                <td>{d.unsaid.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

function Detail({ id, onSelect, onDeleted, onClose }: { id: number; onSelect: (id: number) => void; onDeleted: () => void; onClose: () => void }) {
  const [trace, setTrace] = useState<AiTraceFull | null>(null);
  const [related, setRelated] = useState<AiTraceRelated[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTrace(null);
    setError(null);
    aiTracesApi.get(id)
      .then(({ data }) => { setTrace(data.trace); setRelated(data.related); })
      .catch((e) => setError(message(e)));
  }, [id]);

  const remove = async () => {
    if (!window.confirm('למחוק את הקריאה הזאת?')) return;
    try { await aiTracesApi.remove(id); onDeleted(); } catch (e) { setError(message(e)); }
  };

  if (error) return <Card><ErrorText role="alert">{error}</ErrorText></Card>;
  if (!trace) return <Card><Muted>טוען…</Muted></Card>;
  const request = parse<RequestJson>(trace.request);
  const guard = trace.kind === 'guard' ? parse<GuardDetails>(trace.details) : null;
  return (
    <Card aria-label="פרטי הקריאה">
      <Row style={{ alignItems: 'center' }}>
        <strong>{trace.kind === 'guard' ? 'השומר' : trace.promptKey ?? trace.operation} #{trace.id}</strong>
        <Badge $tone={tone(trace.outcome)}>{OUTCOMES[trace.outcome] ?? trace.outcome}</Badge>
        <span style={{ flex: 1 }} />
        <Btn type="button" $danger onClick={() => void remove()}><Trash2 size={14} />מחיקה</Btn>
        <Btn type="button" $secondary onClick={onClose} aria-label="סגירה"><X size={14} /></Btn>
      </Row>
      <Meta style={{ marginTop: '0.5rem' }}>
        <span>זמן: {time(trace.createdAt)}</span>
        <span>משתמש: {trace.userId ?? '—'}</span>
        {trace.kind === 'call' && <span>מודל: <span dir="ltr">{trace.provider}/{trace.model}</span>{trace.viaFallback ? ' (גיבוי)' : ''}</span>}
        {trace.attempt != null && <span>ניסיון: {trace.attempt}</span>}
        {trace.kind === 'call' && <span>טוקנים: {trace.inputTokens} נכנס · {trace.outputTokens} יצא{trace.cachedTokens ? ` · ${trace.cachedTokens} מטמון` : ''}</span>}
        {trace.kind === 'call' && <span>עלות: {usd(trace.costUsd)}</span>}
        {trace.latencyMs != null && <span>משך: {trace.latencyMs} ms</span>}
        {trace.subject && <span>נושא: {trace.subject}</span>}
        {trace.correlationId && <span>בקשה: <span dir="ltr">{trace.correlationId}</span></span>}
      </Meta>
      {trace.errorMessage && <ErrorText>{trace.errorMessage}</ErrorText>}

      {related.length > 0 && (
        <>
          <H3>באותה בקשה</H3>
          <Row>
            {related.map((r) => (
              <Btn key={r.id} type="button" $secondary onClick={() => onSelect(r.id)}>
                {r.kind === 'guard' ? 'השומר' : r.promptKey ?? '—'}{r.attempt && r.attempt > 1 ? ` (ניסיון ${r.attempt})` : ''}
                <Badge $tone={tone(r.outcome)}>{OUTCOMES[r.outcome] ?? r.outcome}</Badge>
              </Btn>
            ))}
          </Row>
        </>
      )}

      {guard && <GuardView details={guard} />}

      {request?.messages?.map((m, i) => (
        <div key={i}>
          <H3>{m.role === 'system' ? 'הוראות (system)' : m.role === 'user' ? 'מה נשלח (user)' : m.role === 'assistant' ? 'תשובה קודמת (assistant)' : `כלי (${m.role})`}</H3>
          {m.attachments && m.attachments.length > 0 && (
            <Muted>קבצים: {m.attachments.map((a) => `${a.name ?? a.mime} (${Math.round(a.size / 1024)} KB)`).join(', ')}</Muted>
          )}
          {m.text && <Pre>{m.text}</Pre>}
          {m.toolCalls?.map((c, j) => <Pre key={j} dir="ltr">{c.name} {c.args}</Pre>)}
        </div>
      ))}
      {request?.audio && <Muted>הקלטה: {request.audio}</Muted>}
      {request && (request.jsonOutput || request.tools?.length) ? (
        <Muted>{request.jsonOutput ? 'ביקש JSON' : ''}{request.maxOutputTokens ? ` · עד ${request.maxOutputTokens} טוקנים` : ''}{request.tools?.length ? ` · כלים: ${request.tools.join(', ')}` : ''}</Muted>
      ) : null}
      {trace.kind === 'call' && (
        <>
          <H3>מה חזר</H3>
          <Pre>{trace.responseText ?? '—'}</Pre>
        </>
      )}
    </Card>
  );
}

export default function AiTraces() {
  const [filters, setFilters] = useState<AiTraceFilters>({ page: 1, pageSize: 50 });
  const [userText, setUserText] = useState('');
  const [qText, setQText] = useState('');
  const [list, setList] = useState<AiTraceList | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { const { data } = await aiTracesApi.list(filters); setList(data); }
    catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { void load(); }, [load]);

  const set = (patch: Partial<AiTraceFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const applyText = () => set({ userId: userText.trim() ? Number(userText) : undefined, q: qText.trim() || undefined });
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

  return (
    <PageWrap>
      <Title>מה קרה בקריאה</Title>
      <Desc>
        כל קריאה ל-AI כשהמעקב פועל: מה נשלח, מה חזר, כמה טוקנים, כמה עלה וכמה זמן לקח. בצ'אט ההצעה מופיעה גם שורת "השומר" עם מה שהוא הוריד מהתשובה ולמה.
      </Desc>
      <SettingsCard onChanged={() => void load()} />

      <Card>
        <Row>
          <Label>
            משתמש
            <Input dir="ltr" value={userText} onChange={(e) => setUserText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyText()} style={{ width: 80 }} aria-label="מזהה משתמש" />
          </Label>
          <Label>
            פרומפט
            <Select value={filters.promptKey ?? ''} onChange={(e) => set({ promptKey: e.target.value || undefined })} aria-label="פרומפט">
              <option value="">הכל</option>
              {list?.promptKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </Label>
          <Label>
            סוג
            <Select value={filters.kind ?? ''} onChange={(e) => set({ kind: e.target.value || undefined })} aria-label="סוג">
              <option value="">הכל</option>
              <option value="call">קריאות</option>
              <option value="guard">השומר</option>
            </Select>
          </Label>
          <Label>
            תוצאה
            <Select value={filters.outcome ?? ''} onChange={(e) => set({ outcome: e.target.value || undefined })} aria-label="תוצאה">
              <option value="">הכל</option>
              <option value="failed">נכשלו</option>
              <option value="removed">השומר הוריד</option>
              <option value="kept_all">השומר לא הוריד</option>
            </Select>
          </Label>
          <Label>
            נושא / מזהה בקשה
            <Input value={qText} onChange={(e) => setQText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyText()} style={{ width: 180 }} aria-label="חיפוש" />
          </Label>
          <Btn type="button" onClick={applyText}>סינון</Btn>
          <Btn type="button" $secondary onClick={() => void load()} disabled={loading}><RefreshCw size={14} />רענון</Btn>
          <span style={{ flex: 1 }} />
          {list && <Muted>{list.total} שורות</Muted>}
        </Row>
      </Card>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      <Layout>
        <Card style={{ padding: 0, overflow: 'auto', maxHeight: '75vh' }}>
          <Table>
            <thead>
              <tr><th>זמן</th><th>משתמש</th><th>פרומפט</th><th>מודל</th><th>טוקנים</th><th>עלות</th><th>ms</th><th>תוצאה</th><th>תשובה</th></tr>
            </thead>
            <tbody>
              {list?.rows.map((r) => (
                <TRow key={r.id} $active={r.id === selected} $guard={r.kind === 'guard'} onClick={() => setSelected(r.id)}>
                  <td style={{ whiteSpace: 'nowrap' }}>{time(r.createdAt)}</td>
                  <td>{r.userId ?? '—'}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{r.kind === 'guard' ? 'השומר' : r.promptKey ?? r.operation}{r.attempt && r.attempt > 1 ? ` #${r.attempt}` : ''}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{r.model ?? ''}</td>
                  <td>{r.kind === 'call' ? `${r.inputTokens}/${r.outputTokens}` : ''}</td>
                  <td>{r.kind === 'call' ? usd(r.costUsd) : ''}</td>
                  <td>{r.latencyMs ?? ''}</td>
                  <td><Badge $tone={tone(r.outcome)}>{OUTCOMES[r.outcome] ?? r.outcome}</Badge></td>
                  <td><Preview>{r.responsePreview ?? r.errorMessage ?? ''}</Preview></td>
                </TRow>
              ))}
              {list && list.rows.length === 0 && (
                <tr><td colSpan={9}><Muted>אין קריאות שמורות. הפעל את המעקב למעלה ונסה שוב.</Muted></td></tr>
              )}
            </tbody>
          </Table>
          {pages > 1 && (
            <Row style={{ padding: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
              <Btn type="button" $secondary disabled={(filters.page ?? 1) <= 1} onClick={() => set({ page: (filters.page ?? 1) - 1 })}>הקודם</Btn>
              <Muted>{filters.page ?? 1} / {pages}</Muted>
              <Btn type="button" $secondary disabled={(filters.page ?? 1) >= pages} onClick={() => set({ page: (filters.page ?? 1) + 1 })}>הבא</Btn>
            </Row>
          )}
        </Card>
        {selected != null && (
          <Detail
            id={selected}
            onSelect={setSelected}
            onClose={() => setSelected(null)}
            onDeleted={() => { setSelected(null); void load(); }}
          />
        )}
      </Layout>
    </PageWrap>
  );
}
