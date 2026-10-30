import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Save, Upload, X, Eye, Lock, Power, History } from 'lucide-react';
import { aiWritingAdminApi, type WritingBlock, type WritingFeature, type WritingPreview, type WritingVersion } from '../api/aiWritingAdminApi';
import { apiErrorMessage } from '../api/aiSettingsApi';
import AiEvalCard, { RouterEvalCard } from '../components/AiEvalCard';

// ---------------------------------------------------------------------------------------------
// Admin "כתיבה עם AI": the layered writing prompts (identity, base, modes, styles, lengths, examples,
// output). Each block is edited as a draft, previewed, then published: the server validates the
// {{variables}}, keeps the previous text as a version and makes it live within a minute. Output
// contracts are locked (code depends on them). Each feature is turned on/off here: off = no button.
// ---------------------------------------------------------------------------------------------

const LAYER_LABELS: Record<string, string> = {
  identity: 'זהות',
  base: 'בסיס',
  mode: 'מצב',
  type: 'סוג',
  style: 'סגנון',
  length: 'אורך',
  example: 'דוגמה',
  output: 'פורמט פלט',
};
const LAYER_ORDER = ['identity', 'base', 'mode', 'type', 'style', 'length', 'example', 'output'];

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function AiWritingPrompts() {
  const [features, setFeatures] = useState<WritingFeature[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await aiWritingAdminApi.features();
      setFeatures(data);
      setSelectedKey((k) => k ?? data[0]?.key ?? null);
    } catch (e) {
      setError(apiErrorMessage(e, 'טעינת הפרומפטים נכשלה'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = features.find((f) => f.key === selectedKey) ?? null;

  const toggle = async (f: WritingFeature) => {
    setError(null);
    try {
      await aiWritingAdminApi.setActive(f.key, !f.isActive);
      setNotice(!f.isActive ? `"${f.name}" הופעל: הכפתור יופיע למשתמשים תוך דקה.` : `"${f.name}" כובה: הכפתור ייעלם תוך דקה.`);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'שינוי המצב נכשל'));
    }
  };

  return (
    <PageWrap>
      <HeaderRow>
        <Title>כתיבה עם AI · פרומפטים</Title>
        <Btn $variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> רענון
        </Btn>
      </HeaderRow>
      <Muted>
        כל פרומפט בנוי משכבות. עריכה נשמרת כטיוטה ולא משפיעה על משתמשים עד "פרסום". פרסום בודק את המשתנים,
        שומר את הגרסה הקודמת בהיסטוריה ונכנס לתוקף תוך דקה. פיצ'ר כבוי = אין כפתור למשתמשים.
      </Muted>
      {error && <Banner $tone="bad">{error}</Banner>}
      {notice && <Banner $tone="ok" onClick={() => setNotice(null)}>{notice}</Banner>}
      <AiEvalCard />
      <RouterEvalCard />
      <RouterEvalCard title="נתב כרטיס לקוח" path="client-router" offMessage="ההרצה נכשלה (הסוכן בכרטיס הלקוח צריך להיות פעיל)" />

      <Layout>
        <FeatureList>
          {features.map((f) => (
            <FeatureItem key={f.key} $active={f.key === selectedKey} onClick={() => setSelectedKey(f.key)}>
              <div>
                <strong>{f.name}</strong>
                <small>{f.key}</small>
              </div>
              <StateDot $on={f.isActive} title={f.isActive ? 'פעיל' : 'כבוי'} />
            </FeatureItem>
          ))}
          {!loading && features.length === 0 && <Muted>אין פרומפטים של כתיבה במסד הנתונים.</Muted>}
        </FeatureList>
        {selected && <FeatureEditor key={selected.key} feature={selected} onChanged={load} onToggle={() => void toggle(selected)} />}
      </Layout>
    </PageWrap>
  );
}

function FeatureEditor({ feature, onChanged, onToggle }: { feature: WritingFeature; onChanged: () => Promise<void>; onToggle: () => void }) {
  const groups = useMemo(() => {
    const by = new Map<string, WritingBlock[]>();
    for (const b of feature.blocks) by.set(b.layer, [...(by.get(b.layer) ?? []), b]);
    return LAYER_ORDER.filter((l) => by.has(l)).map((l) => ({ layer: l, blocks: by.get(l)! }));
  }, [feature.blocks]);
  const drafts = feature.blocks.filter((b) => b.draft !== null).length + (feature.userTemplateDraft !== null ? 1 : 0);
  const templateBlock: WritingBlock = {
    id: feature.id, key: feature.key, layer: 'feature', variant: '', text: feature.userTemplate ?? '',
    draft: feature.userTemplateDraft, draftUpdatedAt: null, draftUpdatedBy: null, outputLocked: false, fromBrief: false,
    publishedAt: null, publishedBy: null,
  };

  return (
    <div>
      <Card>
        <CardTitle>
          {feature.name} <Code>{feature.key}</Code>
          <Btn $variant={feature.isActive ? 'danger' : 'primary'} onClick={onToggle} style={{ marginInlineStart: 'auto' }}>
            <Power size={16} /> {feature.isActive ? 'כבה' : 'הפעל'}
          </Btn>
        </CardTitle>
        <Muted>{feature.description}</Muted>
        <Meta>
          <span>מצבים: {feature.modes.join(' · ')}</span>
          {feature.styleList && <span>סגנונות: {feature.styleList}</span>}
          {feature.lengthList && <span>אורכים: {feature.lengthList}</span>}
          {feature.typeList && <span>סוגים: {feature.typeList}</span>}
          <span>מקסימום טוקנים: {feature.maxTokens ?? '—'}</span>
          {drafts > 0 && <span style={{ color: '#b45309' }}>{drafts} טיוטות שלא פורסמו</span>}
        </Meta>
      </Card>

      <Card>
        <CardTitle>תבנית הנתונים (שכבה 3)</CardTitle>
        <Muted>המשתנים שהקוד ממלא, בתוך {'{{'}…{'}}'}. שורה שהמשתנה שלה ריק לא נשלחת.</Muted>
        <BlockEditor block={templateBlock} onChanged={onChanged} />
      </Card>

      {groups.map((g) => (
        <Card key={g.layer}>
          <CardTitle>{LAYER_LABELS[g.layer] ?? g.layer}</CardTitle>
          {g.blocks.map((b) => (
            <BlockWrap key={b.id}>
              <BlockHead>
                <Code>{b.variant || g.layer}</Code>
                {!b.fromBrief && <Tag title="נכתב בפיתוח, לא מבריף">לא מהבריף</Tag>}
                {b.outputLocked && <Tag><Lock size={12} /> נעול</Tag>}
                <small>פורסם {formatDate(b.publishedAt)}{b.publishedBy ? ` · ${b.publishedBy}` : ''}</small>
              </BlockHead>
              <BlockEditor block={b} onChanged={onChanged} />
            </BlockWrap>
          ))}
        </Card>
      ))}

      <PreviewCard feature={feature} />
    </div>
  );
}

function BlockEditor({ block, onChanged }: { block: WritingBlock; onChanged: () => Promise<void> }) {
  const [text, setText] = useState(block.draft ?? block.text);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [versions, setVersions] = useState<WritingVersion[] | null>(null);
  useEffect(() => { setText(block.draft ?? block.text); }, [block.draft, block.text]);

  const toggleHistory = async () => {
    if (versions) { setVersions(null); return; }
    try {
      const { data } = await aiWritingAdminApi.versions(block.id);
      setVersions(data);
    } catch (e) {
      setProblem(apiErrorMessage(e, 'טעינת ההיסטוריה נכשלה'));
    }
  };

  const dirty = text !== (block.draft ?? block.text);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setProblem(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      const data = (e as { response?: { data?: { problems?: string[] } } })?.response?.data;
      setProblem(data?.problems?.join('\n') ?? apiErrorMessage(e, 'הפעולה נכשלה'));
    } finally {
      setBusy(false);
    }
  };

  const history = versions && (
    <HistoryList>
      {versions.map((v) => (
        <li key={v.versionNumber}>
          <span>גרסה {v.versionNumber} · {formatDate(v.createdAt)}{v.publishedBy ? ` · ${v.publishedBy}` : ''}{v.notes ? ` · ${v.notes}` : ''}</span>
          <Locked dir="auto">{v.text}</Locked>
          {!block.outputLocked && v.text !== block.text && (
            <Btn $variant="secondary" disabled={busy}
              onClick={() => { if (window.confirm(`להחזיר את גרסה ${v.versionNumber} למשתמשים?`)) void run(() => aiWritingAdminApi.rollback(block.id, v.versionNumber)).then(() => setVersions(null)); }}>
              שחזר גרסה זו
            </Btn>
          )}
        </li>
      ))}
      {versions.length === 0 && <li>אין עדיין גרסאות.</li>}
    </HistoryList>
  );

  if (block.outputLocked) return (
    <>
      <Locked dir="auto">{block.text}</Locked>
      {block.layer !== 'feature' && <Actions><Btn $variant="secondary" onClick={() => void toggleHistory()}><History size={14} /> היסטוריה</Btn></Actions>}
      {history}
    </>
  );
  return (
    <>
      <TextArea dir="auto" value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(14, Math.max(3, text.split('\n').length + 1))} />
      {block.draft !== null && <DraftNote>טיוטה {block.draftUpdatedBy ? `של ${block.draftUpdatedBy}` : ''} {formatDate(block.draftUpdatedAt)} · המשתמשים עדיין רואים את הגרסה המפורסמת</DraftNote>}
      {problem && <Banner $tone="bad" style={{ whiteSpace: 'pre-wrap' }}>{problem}</Banner>}
      <Actions>
        <Btn $variant="secondary" disabled={busy || !dirty} onClick={() => void run(() => aiWritingAdminApi.saveDraft(block.id, text))}>
          <Save size={14} /> שמור טיוטה
        </Btn>
        <Btn disabled={busy || block.draft === null || dirty} onClick={() => void run(() => aiWritingAdminApi.publish(block.id))}
          title={dirty ? 'שמרו טיוטה קודם' : undefined}>
          <Upload size={14} /> פרסם
        </Btn>
        {block.draft !== null && (
          <Btn $variant="danger" disabled={busy} onClick={() => void run(() => aiWritingAdminApi.discardDraft(block.id))}>
            <X size={14} /> בטל טיוטה
          </Btn>
        )}
        <Btn $variant="secondary" onClick={() => void toggleHistory()}>
          <History size={14} /> {versions ? 'הסתר היסטוריה' : 'היסטוריה'}
        </Btn>
      </Actions>
      {history}
    </>
  );
}

function PreviewCard({ feature }: { feature: WritingFeature }) {
  const [mode, setMode] = useState(feature.modes[0] ?? '');
  const [style, setStyle] = useState('');
  const [length, setLength] = useState('');
  const [type, setType] = useState('');
  const [vars, setVars] = useState('quote_items=איטום גג, צביעת קירות\nuser_field=איטום וצבע\nuser_text=');
  const [useDrafts, setUseDrafts] = useState(true);
  const [preview, setPreview] = useState<WritingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    const variables: Record<string, string> = {};
    for (const line of vars.split('\n')) {
      const i = line.indexOf('=');
      if (i > 0) variables[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    try {
      const { data } = await aiWritingAdminApi.preview(feature.key, {
        mode, style: style || null, length: length || null, type: type || null, variables, useDrafts,
      });
      setPreview(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'התצוגה המקדימה נכשלה'));
    }
  };

  return (
    <Card>
      <CardTitle><Eye size={18} /> תצוגה מקדימה (בלי קריאה ל-AI)</CardTitle>
      <Meta>
        <label>מצב <select value={mode} onChange={(e) => setMode(e.target.value)}>{feature.modes.map((m) => <option key={m}>{m}</option>)}</select></label>
        {feature.styleList && <label>סגנון <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="standard" /></label>}
        {feature.lengthList && <label>אורך <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="medium" /></label>}
        {feature.typeList && <label>סוג <input value={type} onChange={(e) => setType(e.target.value)} placeholder="payment" /></label>}
        <label><input type="checkbox" checked={useDrafts} onChange={(e) => setUseDrafts(e.target.checked)} /> כולל טיוטות</label>
      </Meta>
      <Muted>ערכים לדוגמה, שורה לכל משתנה: name=value</Muted>
      <TextArea dir="auto" rows={4} value={vars} onChange={(e) => setVars(e.target.value)} />
      <Actions><Btn onClick={() => void run()}><Eye size={14} /> הצג</Btn></Actions>
      {error && <Banner $tone="bad">{error}</Banner>}
      {preview && (
        <>
          <Muted>משתנים בשימוש: {preview.variablesUsed.join(', ') || '—'}</Muted>
          <PreviewLabel>System</PreviewLabel>
          <Locked dir="auto">{preview.system}</Locked>
          <PreviewLabel>User</PreviewLabel>
          <Locked dir="auto">{preview.user}</Locked>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- styles

const PageWrap = styled.div`
  direction: rtl;
  text-align: right;
  max-width: 1300px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ $variant }) => ($variant === 'secondary' ? '#f1f5f9' : $variant === 'danger' ? '#fee2e2' : '#3b82f6')};
  color: ${({ $variant }) => ($variant === 'secondary' ? '#334155' : $variant === 'danger' ? '#b91c1c' : 'white')};
  &:hover:not(:disabled) { filter: brightness(0.95); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: sticky;
  top: 1rem;
`;

const FeatureItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-align: right;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#fff')};
  cursor: pointer;
  div { display: flex; flex-direction: column; gap: 0.1rem; }
  small { color: #64748b; font-size: 0.72rem; direction: ltr; text-align: right; }
`;

const StateDot = styled.span<{ $on: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $on }) => ($on ? '#16a34a' : '#cbd5e1')};
  flex-shrink: 0;
`;

const Card = styled.section`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.15rem;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h2`
  margin: 0 0 0.6rem 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Muted = styled.p`
  margin: 0 0 0.6rem 0;
  color: #64748b;
  font-size: 0.85rem;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: 0.82rem;
  color: #475569;
  margin-bottom: 0.5rem;
  label { display: inline-flex; align-items: center; gap: 0.35rem; }
  input:not([type='checkbox']), select { padding: 0.25rem 0.4rem; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; width: 8rem; }
`;

const Code = styled.code`
  direction: ltr;
  font-size: 0.78rem;
  background: #f1f5f9;
  color: #334155;
  border-radius: 6px;
  padding: 0.05rem 0.4rem;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.72rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
`;

const BlockWrap = styled.div`
  border-top: 1px solid #f1f5f9;
  padding-top: 0.6rem;
  margin-top: 0.6rem;
  &:first-of-type { border-top: none; margin-top: 0; padding-top: 0; }
`;

const BlockHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  small { color: #94a3b8; font-size: 0.75rem; margin-inline-start: auto; }
`;

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1.5;
  resize: vertical;
`;

const Locked = styled.pre`
  white-space: pre-wrap;
  margin: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  font: inherit;
  font-size: 0.85rem;
  color: #334155;
`;

const HistoryList = styled.ul`
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  li { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: #475569; }
`;

const DraftNote = styled.div`
  font-size: 0.75rem;
  color: #b45309;
  margin-top: 0.25rem;
`;

const PreviewLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  margin: 0.6rem 0 0.25rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.45rem;
`;

const Banner = styled.div<{ $tone: 'ok' | 'bad' }>`
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  background: ${({ $tone }) => ($tone === 'ok' ? '#dcfce7' : '#fee2e2')};
  color: ${({ $tone }) => ($tone === 'ok' ? '#166534' : '#991b1b')};
`;
