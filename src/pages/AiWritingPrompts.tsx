import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Save, Upload, X, Eye, Lock, Power, History, Plus, Trash2, Play, ArrowUp } from 'lucide-react';
import { aiWritingAdminApi, aiCacheAdminApi, ADDABLE_LAYERS, type TestRunResult, type TestSet, type WritingBlock, type WritingFeature, type WritingPreview, type WritingVersion } from '../api/aiWritingAdminApi';
import { apiErrorMessage } from '../api/aiSettingsApi';
import ModelSelect from '../components/ModelSelect';
import AiEvalCard, { RouterEvalCard } from '../components/AiEvalCard';
import { BehaviourCard, TextsListsCard } from '../components/AiBehaviourCards';

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
  question: 'שאלה',
  message: 'הודעה',
  action: 'פעולות',
  rules: 'כללים',
  read: 'קריאה',
};
// Known layers first, in this order; any other layer the server has is shown after them (fix 7, 8.11: nothing hidden).
const LAYER_ORDER = ['identity', 'base', 'rules', 'mode', 'type', 'style', 'length', 'action', 'read', 'question', 'message', 'example', 'output'];

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
      <CacheCard />
      <BehaviourCard />
      <TextsListsCard />
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

// Fix 7 (8.11): saved AI answers. A newer published prompt already makes a saved answer stale; these clear them now.
function CacheCard() {
  const [userId, setUserId] = useState('');
  const [counts, setCounts] = useState<{ customerAnalyses: number; dataAnswers: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const uid = /^\d+$/.test(userId.trim()) ? Number(userId.trim()) : null;

  const refresh = useCallback(async () => {
    try {
      const { data } = await aiCacheAdminApi.counts(uid);
      setCounts(data);
    } catch (e) {
      setMessage(apiErrorMessage(e, 'טעינת המונים נכשלה'));
    }
  }, [uid]);

  useEffect(() => { void refresh(); }, [refresh]);

  const clear = async (what: 'customer' | 'data') => {
    setBusy(true);
    setMessage(null);
    try {
      const { data } = what === 'customer' ? await aiCacheAdminApi.clearCustomerAnalyses(uid) : await aiCacheAdminApi.clearDataAnswers(uid);
      setMessage(`נמחקו ${data.deleted} תשובות שמורות${uid ? ` של משתמש ${uid}` : ''}.`);
      await refresh();
    } catch (e) {
      setMessage(apiErrorMessage(e, 'המחיקה נכשלה'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle>תשובות AI שמורות</CardTitle>
      <Muted>
        פרסום פרומפט כבר מבטל תשובות ישנות שלו. כאן אפשר לנקות עכשיו, לכולם או למשתמש אחד, כדי שהבדיקה הבאה תרוץ על תשובה חדשה.
      </Muted>
      <Actions>
        <label>
          משתמש (ריק = כולם){' '}
          <input value={userId} onChange={(e) => setUserId(e.target.value)} inputMode="numeric" style={{ width: 90 }} />
        </label>
        <Btn $variant="secondary" disabled={busy} onClick={() => void clear('customer')}>
          ניקוי ניתוחי כרטיס לקוח ({counts?.customerAnalyses ?? '…'})
        </Btn>
        <Btn $variant="secondary" disabled={busy} onClick={() => void clear('data')}>
          ניקוי תשובות עמוד נתונים ({counts?.dataAnswers ?? '…'})
        </Btn>
      </Actions>
      {message && <Muted>{message}</Muted>}
    </Card>
  );
}

function FeatureEditor({ feature, onChanged, onToggle }: { feature: WritingFeature; onChanged: () => Promise<void>; onToggle: () => void }) {
  const groups = useMemo(() => {
    const by = new Map<string, WritingBlock[]>();
    for (const b of feature.blocks) by.set(b.layer, [...(by.get(b.layer) ?? []), b]);
    const order = [...LAYER_ORDER.filter((l) => by.has(l)), ...[...by.keys()].filter((l) => !LAYER_ORDER.includes(l)).sort()];
    return order.map((l) => ({ layer: l, blocks: by.get(l)! }));
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
          {drafts > 0 && <span style={{ color: '#b45309' }}>{drafts} טיוטות שלא פורסמו</span>}
        </Meta>
      </Card>

      <SettingsCard feature={feature} onChanged={onChanged} />

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
                {!b.outputLocked && <DeleteBlockButton featureKey={feature.key} block={b} onChanged={onChanged} />}
              </BlockHead>
              <BlockEditor block={b} onChanged={onChanged} />
            </BlockWrap>
          ))}
        </Card>
      ))}

      <AddBlockCard feature={feature} onChanged={onChanged} />
      <PreviewCard feature={feature} />
      <TestSetCard feature={feature} />
    </div>
  );
}

// AI-25 "מחק בלוק": the block is switched off (the AI stops getting it at once, its text stays in the history).
function DeleteBlockButton({ featureKey, block, onChanged }: { featureKey: string; block: WritingBlock; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!window.confirm(`למחוק את הבלוק ${block.key}? ה-AI יפסיק לקבל אותו מיד. "הוסף בלוק" עם אותה שכבה מחזיר אותו.`)) return;
    setBusy(true);
    try {
      await aiWritingAdminApi.deleteBlock(featureKey, block.id);
      await onChanged();
    } catch (e) {
      window.alert(apiErrorMessage(e, 'מחיקת הבלוק נכשלה'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Btn $variant="secondary" disabled={busy} onClick={() => void remove()} style={{ marginInlineStart: 'auto' }} aria-label={`מחק בלוק ${block.key}`}>
      <Trash2 size={14} /> מחק בלוק
    </Btn>
  );
}

// AI-25 "בדיקות שמורות": the prompt's fixed messages, run 1–3 times each with a click (real AI calls), and the run
// compared with the one before: which answers changed, which aren't stable.
function TestSetCard({ feature }: { feature: WritingFeature }) {
  const [set, setSet] = useState<TestSet | null>(null);
  const [title, setTitle] = useState('');
  const [variable, setVariable] = useState('user_text');
  const [value, setValue] = useState('');
  const [repeats, setRepeats] = useState(3);
  const [useDrafts, setUseDrafts] = useState(false);
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSet((await aiWritingAdminApi.testSet(feature.key)).data);
    } catch (e) {
      setMsg(apiErrorMessage(e, 'טעינת הסט נכשלה'));
    }
  }, [feature.key]);
  useEffect(() => { setResult(null); void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, failed: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setMsg(apiErrorMessage(e, failed));
    } finally {
      setBusy(false);
    }
  };

  const add = () => act(async () => {
    await aiWritingAdminApi.addTestCase(feature.key, { title: title.trim(), variables: { [variable.trim()]: value } });
    setTitle('');
    setValue('');
  }, 'הוספת ההודעה נכשלה');

  const up = (index: number) => act(async () => {
    const ids = set!.cases.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await aiWritingAdminApi.orderTestCases(feature.key, ids);
  }, 'שינוי הסדר נכשל');

  const run = () => act(async () => {
    setResult((await aiWritingAdminApi.runTestSet(feature.key, { repeats, useDrafts })).data);
  }, 'ההרצה נכשלה');

  const compareOf = (caseId: number) => result?.comparison.find((c) => c.caseId === caseId);
  const previousOf = (caseId: number) => result?.previous?.results.find((r) => r.caseId === caseId);

  return (
    <Card>
      <CardTitle><Play size={18} /> בדיקות שמורות</CardTitle>
      <Muted>
        סט קבוע של הודעות אמיתיות להוראה הזו. כל הרצה נשמרת ומושווית להרצה הקודמת: האם התשובה השתנתה, והאם היא יציבה
        (אותה תשובה בכל ההרצות). כל הרצה היא קריאה אמיתית ל-AI.
      </Muted>
      {set && set.cases.length === 0 && <Muted>אין עדיין הודעות בסט.</Muted>}
      {set?.cases.map((c, i) => {
        const cmp = compareOf(c.id);
        const now = result?.run.results.find((r) => r.caseId === c.id);
        const before = previousOf(c.id);
        return (
          <BlockWrap key={c.id}>
            <BlockHead>
              <strong>{c.title}</strong>
              <Code>{Object.keys(c.variables).join(', ')}</Code>
              {cmp && <Tag>{cmp.new ? 'חדש' : cmp.changed ? 'השתנה' : 'כמו קודם'} · {cmp.stable ? 'יציב' : 'לא יציב'}</Tag>}
              <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
                <Btn $variant="secondary" disabled={busy || i === 0} onClick={() => void up(i)} aria-label={`הזז למעלה ${c.title}`}><ArrowUp size={14} /></Btn>
                <Btn $variant="secondary" disabled={busy} onClick={() => void act(() => aiWritingAdminApi.deleteTestCase(feature.key, c.id), 'המחיקה נכשלה')} aria-label={`מחק הודעה ${c.title}`}><Trash2 size={14} /></Btn>
              </span>
            </BlockHead>
            {now && (
              <Meta style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {now.outputs.map((o, k) => <span key={k} dir="auto">הרצה {k + 1}: {o ?? now.errors[k] ?? '—'}</span>)}
                {before && <span dir="auto" style={{ opacity: 0.7 }}>בהרצה הקודמת: {before.outputs.join(' | ')}</span>}
              </Meta>
            )}
          </BlockWrap>
        );
      })}
      <Meta>
        <label>שם{' '}<input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: 140 }} /></label>
        <label>משתנה{' '}<input dir="ltr" value={variable} onChange={(e) => setVariable(e.target.value)} style={{ width: 110 }} /></label>
      </Meta>
      <TextArea dir="auto" rows={3} value={value} onChange={(e) => setValue(e.target.value)} aria-label="ההודעה" />
      <Actions>
        <Btn $variant="secondary" disabled={busy || !title.trim() || !value.trim() || !variable.trim()} onClick={() => void add()}><Plus size={14} /> הוסף הודעה לסט</Btn>
        <label>הרצות לכל הודעה{' '}
          <select value={repeats} onChange={(e) => setRepeats(Number(e.target.value))}>
            {Array.from({ length: set?.maxRepeats ?? 3 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={useDrafts} onChange={(e) => setUseDrafts(e.target.checked)} /> להריץ את הטיוטות</label>
        <Btn disabled={busy || !set?.cases.length} onClick={() => void run()}><Play size={14} /> הרץ את הסט</Btn>
      </Actions>
      {result && (
        <Muted>
          הרצה #{result.run.id}{result.previous ? ` מול #${result.previous.id}` : ''}: {result.comparison.filter((c) => c.changed).length} השתנו,{' '}
          {result.comparison.filter((c) => !c.stable).length} לא יציבות.{' '}
          {result.previous && (result.previous.fingerprint === result.run.fingerprint ? 'אותו נוסח הוראה.' : 'נוסח ההוראה השתנה.')}
        </Muted>
      )}
      {msg && <Banner $tone="bad">{msg}</Banner>}
    </Card>
  );
}

// AI-24: add a block (identity, base, example, output) without a developer. It is saved as a draft: it reaches the AI,
// and counts for "הפעל", only after "פרסום" like any other edit.
function AddBlockCard({ feature, onChanged }: { feature: WritingFeature; onChanged: () => Promise<void> }) {
  const [layer, setLayer] = useState<(typeof ADDABLE_LAYERS)[number]>('identity');
  const [variant, setVariant] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const add = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await aiWritingAdminApi.addBlock(feature.key, { layer, variant: variant.trim() || undefined, text });
      setMsg({ tone: 'ok', text: `נוסף ${data.key} כטיוטה. פרסמו אותו כדי שייכנס להוראה.` });
      setText('');
      setVariant('');
      await onChanged();
    } catch (e) {
      setMsg({ tone: 'bad', text: apiErrorMessage(e, 'הוספת הבלוק נכשלה') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle><Plus size={18} /> הוסף בלוק</CardTitle>
      <Meta>
        <label>שכבה{' '}
          <select value={layer} onChange={(e) => setLayer(e.target.value as (typeof ADDABLE_LAYERS)[number])}>
            {ADDABLE_LAYERS.map((l) => <option key={l} value={l}>{LAYER_LABELS[l] ?? l}</option>)}
          </select>
        </label>
        <label>שם נוסף (לא חובה){' '}
          <input dir="ltr" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="negative_2" style={{ width: 120 }} />
        </label>
      </Meta>
      <TextArea dir="auto" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <Actions>
        <Btn disabled={busy || !text.trim()} onClick={() => void add()}><Plus size={14} /> הוסף כטיוטה</Btn>
      </Actions>
      {msg && <Banner $tone={msg.tone}>{msg.text}</Banner>}
    </Card>
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

/** Fix 1 (8.11): model, temperature and output length for this prompt only; empty = the group's setting. */
function SettingsCard({ feature, onChanged }: { feature: WritingFeature; onChanged: () => Promise<void> }) {
  const [model, setModel] = useState(feature.model ?? '');
  const [temperature, setTemperature] = useState(feature.temperature?.toString() ?? '');
  const [maxTokens, setMaxTokens] = useState(feature.maxTokens?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const dirty = model !== (feature.model ?? '') || temperature !== (feature.temperature?.toString() ?? '')
    || maxTokens !== (feature.maxTokens?.toString() ?? '');
  const isClaude = model.startsWith('claude');
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await aiWritingAdminApi.setSettings(feature.key, {
        model: model || null,
        temperature: temperature.trim() === '' ? null : Number(temperature),
        maxTokens: maxTokens.trim() === '' ? null : Number(maxTokens),
      });
      setMsg({ tone: 'ok', text: 'נשמר. נכנס לתוקף תוך דקה.' });
      await onChanged();
    } catch (e) {
      setMsg({ tone: 'bad', text: apiErrorMessage(e, 'השמירה נכשלה') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle>מודל להוראה הזו</CardTitle>
      <Muted>ריק = המודל של הקבוצה (הגדרות AI). שינוי כאן חל רק על {feature.key}.</Muted>
      <Meta>
        <label>מודל
          <ModelSelect value={model} onChange={setModel} emptyLabel="ברירת המחדל של הקבוצה" style={{ width: '13rem' }} />
        </label>
        <label title="0 = עקבי, 1 = יצירתי. מודלי Claude מתעלמים (ה-API לא מקבל טמפרטורה).">טמפרטורה
          <input type="number" min={0} max={2} step={0.1} value={temperature} placeholder="ברירת מחדל"
            onChange={(e) => setTemperature(e.target.value)} />
        </label>
        <label>מקסימום טוקנים
          <input type="number" min={16} max={32000} step={50} value={maxTokens} placeholder="ברירת מחדל"
            onChange={(e) => setMaxTokens(e.target.value)} />
        </label>
        <Btn disabled={busy || !dirty} onClick={() => void save()}><Save size={14} /> שמור</Btn>
      </Meta>
      {isClaude && temperature !== '' && <Muted>מודלי Claude לא מקבלים טמפרטורה: הערך יישמר ויחול רק אם תחזרו למודל של OpenAI.</Muted>}
      {msg && <Banner $tone={msg.tone}>{msg.text}</Banner>}
    </Card>
  );
}

function PreviewCard({ feature }: { feature: WritingFeature }) {
  const [mode, setMode] = useState(feature.modes[0] ?? '');
  const [style, setStyle] = useState('');
  const [length, setLength] = useState('');
  const [type, setType] = useState('');
  const [vars, setVars] = useState('quote_items=איטום גג, צביעת קירות\nuser_field=איטום וצבע\nuser_text=');
  const [useDrafts, setUseDrafts] = useState(true);
  // AI-24: the brochure prompts — titles take the section as the type; content and titles have "מה לשנות?".
  const isBrochureTitle = feature.key === 'brochure_title';
  const canRefine = ['brochure_about', 'brochure_specialties', 'brochure_advantages', 'brochure_title'].includes(feature.key);
  const [refine, setRefine] = useState(false);
  const [preview, setPreview] = useState<WritingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);

  const run = async (callAi = false) => {
    setError(null);
    setRunning(callAi);
    const variables: Record<string, string> = {};
    for (const line of vars.split('\n')) {
      const i = line.indexOf('=');
      if (i > 0) variables[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    try {
      const { data } = await aiWritingAdminApi.preview(feature.key, {
        mode, style: style || null, length: length || null, type: type || null, variables, useDrafts, run: callAi,
        refine: canRefine && refine,
      });
      setPreview(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'התצוגה המקדימה נכשלה'));
    } finally {
      setRunning(false);
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
        {isBrochureTitle && <label>סקשן <input value={type} onChange={(e) => setType(e.target.value)} placeholder="about" /></label>}
        {canRefine && <label><input type="checkbox" checked={refine} onChange={(e) => setRefine(e.target.checked)} /> מה לשנות?</label>}
        <label><input type="checkbox" checked={useDrafts} onChange={(e) => setUseDrafts(e.target.checked)} /> כולל טיוטות</label>
      </Meta>
      <Muted>ערכים לדוגמה, שורה לכל משתנה: name=value</Muted>
      <TextArea dir="auto" rows={4} value={vars} onChange={(e) => setVars(e.target.value)} />
      <Actions>
        <Btn onClick={() => void run()}><Eye size={14} /> הצג</Btn>
        {/* Tool 4 (8.11): the draft runs once for you only; users keep the published prompt until "פרסום". */}
        <Btn $variant="secondary" disabled={running} onClick={() => void run(true)}>{running ? 'מריץ…' : 'נסה עכשיו (קריאה אחת ל-AI)'}</Btn>
      </Actions>
      {error && <Banner $tone="bad">{error}</Banner>}
      {preview && (
        <>
          <Muted>משתנים בשימוש: {preview.variablesUsed.join(', ') || '—'}</Muted>
          <PreviewLabel>System</PreviewLabel>
          <Locked dir="auto">{preview.system}</Locked>
          <PreviewLabel>User</PreviewLabel>
          <Locked dir="auto">{preview.user}</Locked>
          <Muted style={{ marginTop: '0.5rem' }}>
            מודל: {preview.model || 'של הקבוצה'} · טמפרטורה: {preview.temperature ?? 'ברירת מחדל'} · מקסימום טוקנים: {preview.maxTokens ?? 'ברירת מחדל'}
          </Muted>
          {(preview.output != null || preview.runError) && (
            <>
              <PreviewLabel>תשובת ה-AI{preview.servedBy ? ` (${preview.servedBy})` : ''}</PreviewLabel>
              {preview.runError ? <Banner $tone="bad">{preview.runError}</Banner> : <Locked dir="auto">{preview.output}</Locked>}
            </>
          )}
          {preview.extras && preview.extras.length > 0 && (
            <>
              <PreviewLabel>שכבות שהקוד מצרף לפי המצב (פעולה, הודעה, שאלה, כללים)</PreviewLabel>
              {preview.extras.map((x) => (
                <div key={x.key} style={{ marginBottom: '0.5rem' }}>
                  <Code>{x.key}</Code>{x.maxTokens ? <small> · עד {x.maxTokens} טוקנים</small> : null}
                  <Locked dir="auto">{x.text}</Locked>
                </div>
              ))}
            </>
          )}
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
