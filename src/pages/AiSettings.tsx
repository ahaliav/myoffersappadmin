import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  RefreshCw, Save, X, PlugZap, CheckCircle2, XCircle, AlertTriangle, Plus, Pencil, Search, History, ShieldAlert,
} from 'lucide-react';
import {
  aiSettingsApi, apiErrorMessage,
  type AiSettingsOverview, type AiModel, type AiProvider, type AiTestResult, type AiDiscoveredModel,
  type AiAuditEntry, type AiModelUpsert, type AiOperationStatus,
} from '../api/aiSettingsApi';

// ---------------------------------------------------------------------------------------------
// Admin "AI Settings": which provider/model the app uses, the model catalog, connection tests and
// the change history. The server is the source of truth: this screen only edits a draft and sends
// it for validation + activation. API keys never reach the browser (only "configured: yes/no").
// ---------------------------------------------------------------------------------------------

const CAPABILITY_LABELS: Record<string, string> = {
  text: 'טקסט',
  streaming: 'הזרמה',
  json_output: 'JSON',
  tool_calling: 'כלים',
  image_input: 'קלט תמונה',
  document_input: 'קלט מסמך',
  image_generation: 'יצירת תמונות',
  audio_transcription: 'תמלול',
};

const capLabel = (key: string) => CAPABILITY_LABELS[key] ?? key;

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

interface OverrideDraft { modelId: number | null; fallbackModelId: number | null }
interface Draft {
  defaultModelId: number;
  defaultFallbackModelId: number | null;
  overrides: Record<string, OverrideDraft>;
  notes: string;
}

function draftFrom(o: AiSettingsOverview): Draft {
  const overrides: Record<string, OverrideDraft> = {};
  for (const op of o.operations) overrides[op.key] = { modelId: null, fallbackModelId: null };
  for (const ov of o.activeConfiguration.overrides)
    overrides[ov.operation] = { modelId: ov.modelId, fallbackModelId: ov.fallbackModelId };
  return {
    defaultModelId: o.activeConfiguration.defaultModelId,
    defaultFallbackModelId: o.activeConfiguration.defaultFallbackModelId,
    overrides,
    notes: '',
  };
}

const sameDraft = (a: Draft, b: Draft) =>
  a.defaultModelId === b.defaultModelId &&
  a.defaultFallbackModelId === b.defaultFallbackModelId &&
  Object.keys({ ...a.overrides, ...b.overrides }).every(
    (k) => (a.overrides[k]?.modelId ?? null) === (b.overrides[k]?.modelId ?? null) &&
      (a.overrides[k]?.fallbackModelId ?? null) === (b.overrides[k]?.fallbackModelId ?? null),
  );

/** Client-side hint only; the server re-checks everything on save. */
function modelProblem(model: AiModel | undefined, provider: AiProvider | undefined, required: string[]): string | null {
  if (!model) return 'המודל לא נמצא בקטלוג';
  if (!model.enabled) return 'המודל מושבת';
  if (!provider) return 'ספק לא מוכר';
  if (!provider.enabled) return `הספק ${provider.name} מושבת`;
  if (!provider.credentialsConfigured) return `אין מפתח API בשרת ל-${provider.name}`;
  const available = model.capabilities.filter((c) => provider.supportedCapabilities.includes(c));
  const missing = required.filter((c) => !available.includes(c));
  return missing.length ? `חסר: ${missing.map(capLabel).join(', ')}` : null;
}

// ---------------------------------------------------------------- styles

const PageWrap = styled.div`
  direction: rtl;
  text-align: right;
  max-width: 1200px;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
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
  padding: 0.5rem 0.9rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ $variant }) => ($variant === 'secondary' ? '#f1f5f9' : $variant === 'danger' ? '#fee2e2' : '#3b82f6')};
  color: ${({ $variant }) => ($variant === 'secondary' ? '#334155' : $variant === 'danger' ? '#b91c1c' : 'white')};
  &:hover:not(:disabled) { filter: brightness(0.95); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const Card = styled.section`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.08);
  padding: 1.1rem 1.25rem;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h2`
  margin: 0 0 0.85rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Muted = styled.p`
  margin: 0 0 0.75rem 0;
  color: #64748b;
  font-size: 0.85rem;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem 1.25rem;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.9rem;
  color: #0f172a;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: #64748b;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`;

const Chip = styled.span<{ $tone?: 'ok' | 'warn' | 'bad' | 'muted' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: ${({ $tone }) => ($tone === 'ok' ? '#dcfce7' : $tone === 'warn' ? '#fef3c7' : $tone === 'bad' ? '#fee2e2' : '#f1f5f9')};
  color: ${({ $tone }) => ($tone === 'ok' ? '#166534' : $tone === 'warn' ? '#92400e' : $tone === 'bad' ? '#991b1b' : '#334155')};
`;

const Banner = styled.div<{ $tone: 'ok' | 'warn' | 'bad' }>`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  white-space: pre-line;
  background: ${({ $tone }) => ($tone === 'ok' ? '#f0fdf4' : $tone === 'warn' ? '#fffbeb' : '#fef2f2')};
  border: 1px solid ${({ $tone }) => ($tone === 'ok' ? '#bbf7d0' : $tone === 'warn' ? '#fde68a' : '#fecaca')};
  color: ${({ $tone }) => ($tone === 'ok' ? '#166534' : $tone === 'warn' ? '#92400e' : '#991b1b')};
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  direction: rtl;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  box-sizing: border-box;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  th, td { padding: 0.55rem 0.5rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; text-align: right; }
  th { color: #64748b; font-weight: 500; font-size: 0.75rem; white-space: nowrap; }
`;

const Code = styled.code`
  direction: ltr;
  unicode-bidi: embed;
  font-size: 0.8rem;
  background: #f8fafc;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
`;

const Dialog = styled.div`
  direction: rtl;
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  width: min(560px, 100%);
  max-height: 90vh;
  overflow: auto;
`;

const Toggle = styled.input.attrs({ type: 'checkbox' })`
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
`;

// ---------------------------------------------------------------- page

export default function AiSettings() {
  const [overview, setOverview] = useState<AiSettingsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<number, AiTestResult | 'running' | { error: string }>>({});
  const [providerError, setProviderError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<{ provider: string; models: AiDiscoveredModel[] } | null>(null);
  const [modelForm, setModelForm] = useState<{ id?: number; value: AiModelUpsert } | null>(null);
  const [audit, setAudit] = useState<AiAuditEntry[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await aiSettingsApi.get();
      setOverview(res.data);
      setDraft(draftFrom(res.data));
      setConflict(false);
      setForbidden(false);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) setForbidden(true);
      else setLoadError(apiErrorMessage(err, 'טעינת הגדרות ה-AI נכשלה.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const res = await aiSettingsApi.audit(50);
      setAudit(res.data);
    } catch {
      setAudit([]);
    }
  }, []);

  useEffect(() => { void load(); void loadAudit(); }, [load, loadAudit]);

  const providers = useMemo(() => new Map((overview?.providers ?? []).map((p) => [p.key, p])), [overview]);
  const models = useMemo(() => new Map((overview?.models ?? []).map((m) => [m.id, m])), [overview]);
  const original = useMemo(() => (overview ? draftFrom(overview) : null), [overview]);
  const dirty = !!(draft && original && !sameDraft(draft, original));

  const modelName = (id: number | null | undefined) => {
    if (id == null) return '—';
    const m = models.get(id);
    return m ? `${providers.get(m.providerKey)?.name ?? m.providerKey} · ${m.displayName}` : `#${id}`;
  };

  const effective = (op: AiOperationStatus, d: Draft) => {
    const ov = d.overrides[op.key];
    return ov?.modelId != null
      ? { modelId: ov.modelId, fallbackModelId: ov.fallbackModelId }
      : { modelId: d.defaultModelId, fallbackModelId: d.defaultFallbackModelId };
  };

  const draftWarnings = useMemo(() => {
    if (!overview || !draft) return [] as string[];
    const out: string[] = [];
    for (const op of overview.operations) {
      // An operation no feature uses yet (image generation) never blocks saving; its row still shows the problem.
      if (!op.inUse) continue;
      const { modelId, fallbackModelId } = effective(op, draft);
      const m = models.get(modelId);
      const problem = modelProblem(m, m ? providers.get(m.providerKey) : undefined, op.requiredCapabilities);
      if (problem) out.push(`${op.displayNameHe}: ${problem}`);
      if (fallbackModelId != null && fallbackModelId !== modelId) {
        const f = models.get(fallbackModelId);
        const fp = modelProblem(f, f ? providers.get(f.providerKey) : undefined, op.requiredCapabilities);
        if (fp) out.push(`${op.displayNameHe} (גיבוי): ${fp}`);
      }
    }
    return out;
  }, [overview, draft, models, providers]);

  const activate = async () => {
    if (!overview || !draft) return;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const res = await aiSettingsApi.activate({
        expectedVersion: overview.activeConfiguration.version,
        defaultModelId: draft.defaultModelId,
        defaultFallbackModelId: draft.defaultFallbackModelId,
        overrides: Object.entries(draft.overrides)
          .filter(([, v]) => v.modelId != null)
          .map(([operation, v]) => ({ operation, modelId: v.modelId as number, fallbackModelId: v.fallbackModelId })),
        notes: draft.notes.trim() || undefined,
      });
      setOverview(res.data);
      setDraft(draftFrom(res.data));
      setConfirmOpen(false);
      setNotice(`הגדרה גרסה ${res.data.activeConfiguration.version} הופעלה. בקשות AI חדשות משתמשות בה מעכשיו.`);
      void loadAudit();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setConflict(status === 409);
      setSaveError(apiErrorMessage(err, 'השמירה נכשלה.'));
      setConfirmOpen(false);
      void loadAudit();
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (modelId: number) => {
    setTests((t) => ({ ...t, [modelId]: 'running' }));
    try {
      const res = await aiSettingsApi.test(modelId);
      setTests((t) => ({ ...t, [modelId]: res.data }));
      // Refresh "last test" fields without touching the draft.
      const fresh = await aiSettingsApi.get();
      setOverview(fresh.data);
      void loadAudit();
    } catch (err) {
      setTests((t) => ({ ...t, [modelId]: { error: apiErrorMessage(err, 'הבדיקה נכשלה.') } }));
    }
  };

  const updateProvider = async (key: string, body: { enabled?: boolean; timeoutSeconds?: number }) => {
    setProviderError(null);
    try {
      await aiSettingsApi.updateProvider(key, body);
      const fresh = await aiSettingsApi.get();
      setOverview(fresh.data);
      if (!dirty) setDraft(draftFrom(fresh.data));
      void loadAudit();
    } catch (err) {
      setProviderError(apiErrorMessage(err, 'עדכון הספק נכשל.'));
    }
  };

  const discover = async (key: string) => {
    setProviderError(null);
    try {
      const res = await aiSettingsApi.discover(key);
      setDiscovered({ provider: key, models: res.data });
    } catch (err) {
      setProviderError(apiErrorMessage(err, 'רשימת המודלים לא נטענה.'));
    }
  };

  const saveModel = async (id: number | undefined, value: AiModelUpsert): Promise<string | null> => {
    try {
      if (id) await aiSettingsApi.updateModel(id, value);
      else await aiSettingsApi.createModel(value);
      const fresh = await aiSettingsApi.get();
      setOverview(fresh.data);
      if (!dirty) setDraft(draftFrom(fresh.data));
      setModelForm(null);
      void loadAudit();
      return null;
    } catch (err) {
      return apiErrorMessage(err, 'שמירת המודל נכשלה.');
    }
  };

  // ---------------------------------------------------------------- render

  if (forbidden) {
    return (
      <PageWrap>
        <Title>הגדרות AI</Title>
        <Banner $tone="bad" role="alert"><ShieldAlert size={18} /> אין לך הרשאת מנהל למסך הזה.</Banner>
      </PageWrap>
    );
  }

  if (loading && !overview) {
    return <PageWrap><Title>הגדרות AI</Title><Muted role="status">טוען…</Muted></PageWrap>;
  }

  if (loadError && !overview) {
    return (
      <PageWrap>
        <Title>הגדרות AI</Title>
        <Banner $tone="bad" role="alert"><XCircle size={18} /> {loadError}</Banner>
        <Btn type="button" onClick={() => void load()}><RefreshCw size={16} /> נסו שוב</Btn>
      </PageWrap>
    );
  }

  if (!overview || !draft) return null;

  const active = overview.activeConfiguration;
  const defaultModel = models.get(active.defaultModelId);
  const defaultProvider = defaultModel ? providers.get(defaultModel.providerKey) : undefined;

  return (
    <PageWrap>
      <HeaderRow>
        <Title>הגדרות AI</Title>
        <Btn type="button" $variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> רענון
        </Btn>
      </HeaderRow>

      {notice && <Banner $tone="ok" role="status"><CheckCircle2 size={18} /> {notice}</Banner>}
      {!overview.health.healthy && (
        <Banner $tone="warn" role="alert">
          <AlertTriangle size={18} />
          <span>
            ההגדרה הפעילה לא תקינה לחלק מהפעולות:{'\n'}
            {[...overview.health.problems, ...(overview.health.storeError ? [`שגיאת טעינה בשרת: ${overview.health.storeError}`] : [])].join('\n')}
          </span>
        </Banner>
      )}

      {/* ---------------------------------------------------- summary */}
      <Card aria-label="סיכום">
        <CardTitle>סיכום ההגדרה הפעילה</CardTitle>
        <SummaryGrid>
          <Stat><StatLabel>ספק פעיל (ברירת מחדל)</StatLabel>{defaultProvider?.name ?? '—'}</Stat>
          <Stat><StatLabel>מודל פעיל</StatLabel><span>{defaultModel?.displayName ?? '—'} <Code>{defaultModel?.modelKey}</Code></span></Stat>
          <Stat>
            <StatLabel>יכולות</StatLabel>
            <Chips>{(defaultModel?.capabilities ?? []).map((c) => <Chip key={c}>{capLabel(c)}</Chip>)}</Chips>
          </Stat>
          <Stat>
            <StatLabel>מצב</StatLabel>
            {overview.health.healthy ? <Chip $tone="ok">תקין</Chip> : <Chip $tone="warn">דורש טיפול</Chip>}
          </Stat>
          <Stat><StatLabel>בדיקת חיבור מוצלחת אחרונה</StatLabel>{formatDate(defaultModel?.lastSuccessfulTestAt)}</Stat>
          <Stat><StatLabel>גרסת הגדרה</StatLabel>{active.version}</Stat>
          <Stat><StatLabel>עודכן</StatLabel>{formatDate(active.updatedAt)}</Stat>
          <Stat><StatLabel>עודכן על ידי</StatLabel>{active.updatedBy ?? '—'}</Stat>
        </SummaryGrid>
        {active.notes && <Muted style={{ marginTop: '0.75rem' }}>הערה: {active.notes}</Muted>}
      </Card>

      {/* ---------------------------------------------------- active configuration editor */}
      <Card aria-label="בחירת מודלים">
        <CardTitle>בחירת ספק ומודל</CardTitle>
        <Muted>
          השינויים נשמרים כטיוטה עד שלוחצים "שמירה והפעלה". מודל שלא היה בשימוש צריך בדיקת חיבור מוצלחת לפני שאפשר להפעיל אותו.
          בדיקת חיבור לא מפעילה שום דבר. אין מעבר אוטומטי למודל אחר: גיבוי פועל רק אם הוגדר כאן, ורק בתקלה זמנית.
        </Muted>

        {saveError && (
          <Banner $tone="bad" role="alert">
            <XCircle size={18} />
            <span>{saveError}</span>
            {conflict && <Btn type="button" $variant="secondary" onClick={() => void load()}>טעינה מחדש</Btn>}
          </Banner>
        )}

        <FieldRow>
          <Label>
            מודל ברירת מחדל
            <Select
              aria-label="מודל ברירת מחדל"
              value={draft.defaultModelId}
              onChange={(e) => setDraft({ ...draft, defaultModelId: Number(e.target.value) })}
            >
              <ModelOptions models={overview.models} providers={providers} />
            </Select>
          </Label>
          <Label>
            גיבוי לברירת המחדל (אופציונלי)
            <Select
              aria-label="גיבוי לברירת המחדל"
              value={draft.defaultFallbackModelId ?? ''}
              onChange={(e) => setDraft({ ...draft, defaultFallbackModelId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">ללא גיבוי</option>
              <ModelOptions models={overview.models} providers={providers} />
            </Select>
          </Label>
        </FieldRow>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>פעולה</th>
                <th>נדרש</th>
                <th>מודל</th>
                <th>גיבוי</th>
                <th>בפועל</th>
              </tr>
            </thead>
            <tbody>
              {overview.operations.map((op) => {
                const ov = draft.overrides[op.key] ?? { modelId: null, fallbackModelId: null };
                const eff = effective(op, draft);
                const m = models.get(eff.modelId);
                const problem = (op.inUse || ov.modelId != null)
                  ? modelProblem(m, m ? providers.get(m.providerKey) : undefined, op.requiredCapabilities)
                  : null;
                return (
                  <tr key={op.key}>
                    <td>
                      <div>{op.displayNameHe}</div>
                      <Muted style={{ margin: 0 }}>{op.inUse ? op.usedBy : 'אין עדיין פיצ\'ר שמשתמש בזה'}</Muted>
                    </td>
                    <td><Chips>{op.requiredCapabilities.map((c) => <Chip key={c}>{capLabel(c)}</Chip>)}</Chips></td>
                    <td>
                      <Select
                        aria-label={`מודל עבור ${op.displayNameHe}`}
                        value={ov.modelId ?? ''}
                        onChange={(e) => setDraft({
                          ...draft,
                          overrides: {
                            ...draft.overrides,
                            [op.key]: { modelId: e.target.value ? Number(e.target.value) : null, fallbackModelId: e.target.value ? ov.fallbackModelId : null },
                          },
                        })}
                      >
                        <option value="">כמו ברירת המחדל</option>
                        <ModelOptions models={overview.models} providers={providers} />
                      </Select>
                    </td>
                    <td>
                      <Select
                        aria-label={`גיבוי עבור ${op.displayNameHe}`}
                        value={ov.fallbackModelId ?? ''}
                        disabled={ov.modelId == null}
                        title={ov.modelId == null ? 'משתמש בגיבוי של ברירת המחדל' : undefined}
                        onChange={(e) => setDraft({
                          ...draft,
                          overrides: { ...draft.overrides, [op.key]: { ...ov, fallbackModelId: e.target.value ? Number(e.target.value) : null } },
                        })}
                      >
                        <option value="">{ov.modelId == null ? 'כמו ברירת המחדל' : 'ללא גיבוי'}</option>
                        <ModelOptions models={overview.models} providers={providers} />
                      </Select>
                    </td>
                    <td>
                      <div>{modelName(eff.modelId)}</div>
                      {problem
                        ? <Chip $tone="bad"><AlertTriangle size={12} /> {problem}</Chip>
                        : (op.inUse ? <Chip $tone="ok">מתאים</Chip> : <Chip $tone="muted">לא בשימוש</Chip>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>

        {draftWarnings.length > 0 && dirty && (
          <Banner $tone="warn" role="alert" style={{ marginTop: '0.75rem' }}>
            <AlertTriangle size={18} />
            <span>הטיוטה לא תעבור את בדיקת השרת:{'\n'}{draftWarnings.join('\n')}</span>
          </Banner>
        )}

        <Label style={{ marginTop: '0.5rem' }}>
          הערה לשינוי (אופציונלי)
          <Input value={draft.notes} maxLength={500} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </Label>

        <Actions>
          <Btn type="button" disabled={!dirty || saving} onClick={() => setConfirmOpen(true)}>
            <Save size={16} /> שמירה והפעלה
          </Btn>
          <Btn type="button" $variant="secondary" disabled={!dirty || saving} onClick={() => { setDraft(draftFrom(overview)); setSaveError(null); }}>
            <X size={16} /> ביטול
          </Btn>
        </Actions>
      </Card>

      {/* ---------------------------------------------------- providers */}
      <Card aria-label="ספקים">
        <CardTitle>ספקים</CardTitle>
        <Muted>מפתחות ה-API נשמרים בשרת בלבד (קובץ ‎.env או משתני סביבה) ולא מוצגים כאן. כדי להחליף מפתח מעדכנים אותו בשרת ומפעילים מחדש את השירות.</Muted>
        {providerError && <Banner $tone="bad" role="alert"><XCircle size={18} /> {providerError}</Banner>}
        <TableWrap>
          <Table>
            <thead>
              <tr><th>ספק</th><th>פעיל</th><th>מפתח API</th><th>זמן המתנה (שניות)</th><th>יכולות שהקוד תומך בהן</th><th /></tr>
            </thead>
            <tbody>
              {overview.providers.map((p) => (
                <ProviderRow key={p.key} provider={p} onUpdate={updateProvider} onDiscover={discover} />
              ))}
            </tbody>
          </Table>
        </TableWrap>
        {discovered && (
          <div style={{ marginTop: '0.75rem' }}>
            <Muted>מודלים שהספק {providers.get(discovered.provider)?.name} מציע ({discovered.models.length}). שום דבר לא נוסף לקטלוג אוטומטית.</Muted>
            <Chips>
              {discovered.models.map((d) => (
                d.inCatalog
                  ? <Chip key={d.modelKey} $tone="muted"><Code>{d.modelKey}</Code> בקטלוג</Chip>
                  : (
                    <Btn key={d.modelKey} type="button" $variant="secondary" onClick={() => setModelForm({
                      value: {
                        providerKey: discovered.provider, modelKey: d.modelKey, displayName: d.displayName ?? d.modelKey,
                        enabled: false, capabilities: ['text'], fromDiscovery: true,
                      },
                    })}
                    >
                      <Plus size={14} /> {d.modelKey}
                    </Btn>
                  )
              ))}
            </Chips>
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------- catalog */}
      <Card aria-label="קטלוג מודלים">
        <HeaderRow style={{ marginBottom: '0.5rem' }}>
          <CardTitle style={{ margin: 0 }}>קטלוג מודלים</CardTitle>
          <Btn type="button" $variant="secondary" onClick={() => setModelForm({
            value: { providerKey: overview.providers[0]?.key, modelKey: '', displayName: '', enabled: true, capabilities: ['text'] },
          })}
          >
            <Plus size={16} /> הוספת מודל
          </Btn>
        </HeaderRow>
        <TableWrap>
          <Table>
            <thead>
              <tr><th>מודל</th><th>ספק</th><th>יכולות</th><th>פעיל</th><th>בשימוש</th><th>בדיקה אחרונה</th><th /></tr>
            </thead>
            <tbody>
              {overview.models.map((m) => {
                const t = tests[m.id];
                return (
                  <tr key={m.id}>
                    <td><div>{m.displayName}</div><Code>{m.modelKey}</Code></td>
                    <td>{providers.get(m.providerKey)?.name ?? m.providerKey}</td>
                    <td><Chips>{m.capabilities.map((c) => <Chip key={c}>{capLabel(c)}</Chip>)}</Chips></td>
                    <td>{m.enabled ? <Chip $tone="ok">פעיל</Chip> : <Chip $tone="muted">מושבת</Chip>}</td>
                    <td>{m.usedBy.length ? m.usedBy.join(', ') : '—'}</td>
                    <td>
                      {t === 'running' && <span role="status">בודק…</span>}
                      {t && t !== 'running' && 'error' in t && <Chip $tone="bad">{t.error}</Chip>}
                      {t && t !== 'running' && 'success' in t && (
                        <Chip $tone={t.success ? 'ok' : 'bad'}>
                          {t.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {t.message} ({t.elapsedMs}ms)
                        </Chip>
                      )}
                      {!t && (m.lastTestAt
                        ? <Chip $tone={m.lastTestSuccess ? 'ok' : 'bad'} title={m.lastTestMessage ?? ''}>{m.lastTestSuccess ? 'הצליחה' : 'נכשלה'} · {formatDate(m.lastTestAt)}</Chip>
                        : <Chip $tone="muted">לא נבדק</Chip>)}
                    </td>
                    <td>
                      <Actions style={{ marginTop: 0 }}>
                        <Btn type="button" $variant="secondary" aria-label={`בדיקת חיבור ${m.modelKey}`} disabled={t === 'running'} onClick={() => void runTest(m.id)}>
                          <PlugZap size={14} /> בדיקת חיבור
                        </Btn>
                        <Btn type="button" $variant="secondary" aria-label={`עריכת ${m.modelKey}`} onClick={() => setModelForm({
                          id: m.id,
                          value: {
                            displayName: m.displayName, enabled: m.enabled, capabilities: m.capabilities,
                            maxInputTokens: m.maxInputTokens, maxOutputTokens: m.maxOutputTokens,
                            inputPricePerMTok: m.inputPricePerMTok, outputPricePerMTok: m.outputPricePerMTok,
                            cachedInputPricePerMTok: m.cachedInputPricePerMTok, effort: m.effort, notes: m.notes,
                          },
                        })}
                        >
                          <Pencil size={14} /> עריכה
                        </Btn>
                      </Actions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
        <Muted style={{ marginTop: '0.5rem' }}>מחירים משמשים להערכה בלבד ואינם החיוב בפועל.</Muted>
      </Card>

      {/* ---------------------------------------------------- per-prompt models */}
      {overview.promptModelOverrides.length > 0 && (
        <Card aria-label="מודל לפי פרומפט">
          <CardTitle>מודל שהוגדר בפרומפט</CardTitle>
          <Muted>פרומפט עם שדה "מודל" משתמש בו רק אם הוא מודל פעיל בקטלוג. אחרת הפעולה משתמשת במודל שהוגדר כאן. עורכים במסך הפרומפטים.</Muted>
          <TableWrap>
            <Table>
              <thead><tr><th>פרומפט</th><th>מודל</th><th>מצב</th></tr></thead>
              <tbody>
                {overview.promptModelOverrides.map((p) => (
                  <tr key={p.promptKey}>
                    <td>{p.promptName} <Code>{p.promptKey}</Code></td>
                    <td><Code>{p.model}</Code></td>
                    <td>{p.honored ? <Chip $tone="ok">בשימוש</Chip> : <Chip $tone="warn">לא בשימוש: {p.reason}</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      )}

      {/* ---------------------------------------------------- audit */}
      <Card aria-label="היסטוריית שינויים">
        <CardTitle><History size={18} /> היסטוריית שינויים</CardTitle>
        {audit === null ? <Muted role="status">טוען…</Muted> : audit.length === 0 ? <Muted>אין רשומות.</Muted> : (
          <TableWrap>
            <Table>
              <thead><tr><th>מתי</th><th>מי</th><th>פעולה</th><th>תוצאה</th><th>לפני</th><th>אחרי</th><th>הודעה</th></tr></thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.createdAt)}</td>
                    <td>{a.userEmail ?? '—'}</td>
                    <td><Code>{a.action}</Code></td>
                    <td>{a.success ? <Chip $tone="ok">הצליח</Chip> : <Chip $tone="bad">נכשל</Chip>}</td>
                    <td><Code>{a.previousValue ?? '—'}</Code></td>
                    <td><Code>{a.newValue ?? '—'}</Code></td>
                    <td>{a.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {confirmOpen && (
        <Overlay>
          <Dialog role="dialog" aria-modal="true" aria-label="אישור הפעלה">
            <CardTitle>להפעיל את ההגדרה החדשה?</CardTitle>
            <Muted>בקשות AI חדשות יעברו להגדרה הזו מיד. בקשות שכבר רצות יסתיימו עם ההגדרה הקודמת.</Muted>
            <ul style={{ paddingInlineStart: '1.1rem', fontSize: '0.875rem' }}>
              {original && draft.defaultModelId !== original.defaultModelId && (
                <li>ברירת מחדל: {modelName(original.defaultModelId)} ← {modelName(draft.defaultModelId)}</li>
              )}
              {original && draft.defaultFallbackModelId !== original.defaultFallbackModelId && (
                <li>גיבוי: {modelName(original.defaultFallbackModelId)} ← {modelName(draft.defaultFallbackModelId)}</li>
              )}
              {overview.operations.map((op) => {
                const a = original?.overrides[op.key];
                const b = draft.overrides[op.key];
                if ((a?.modelId ?? null) === (b?.modelId ?? null) && (a?.fallbackModelId ?? null) === (b?.fallbackModelId ?? null)) return null;
                const label = (v?: OverrideDraft) => (v?.modelId == null ? 'כמו ברירת המחדל' : modelName(v.modelId) + (v.fallbackModelId ? ` (גיבוי: ${modelName(v.fallbackModelId)})` : ''));
                return <li key={op.key}>{op.displayNameHe}: {label(a)} ← {label(b)}</li>;
              })}
            </ul>
            {draftWarnings.length > 0 && (
              <Banner $tone="warn"><AlertTriangle size={18} /> <span>{draftWarnings.join('\n')}</span></Banner>
            )}
            <Actions>
              <Btn type="button" disabled={saving} onClick={() => void activate()}>{saving ? 'מפעיל…' : 'הפעלה'}</Btn>
              <Btn type="button" $variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>חזרה</Btn>
            </Actions>
          </Dialog>
        </Overlay>
      )}

      {modelForm && (
        <ModelForm
          initial={modelForm.value}
          isNew={!modelForm.id}
          providers={overview.providers}
          capabilityKeys={overview.capabilityKeys}
          onCancel={() => setModelForm(null)}
          onSave={(value) => saveModel(modelForm.id, value)}
        />
      )}
    </PageWrap>
  );
}

// ---------------------------------------------------------------- pieces

function ModelOptions({ models, providers }: { models: AiModel[]; providers: Map<string, AiProvider> }) {
  const groups = [...providers.values()];
  return (
    <>
      {groups.map((p) => (
        <optgroup key={p.key} label={p.enabled ? p.name : `${p.name} (מושבת)`}>
          {models.filter((m) => m.providerKey === p.key).map((m) => (
            <option key={m.id} value={m.id} disabled={!m.enabled || !p.enabled}>
              {m.displayName} ({m.modelKey}){m.enabled ? '' : ' · מושבת'}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function ProviderRow({ provider, onUpdate, onDiscover }: {
  provider: AiProvider;
  onUpdate: (key: string, body: { enabled?: boolean; timeoutSeconds?: number }) => Promise<void>;
  onDiscover: (key: string) => Promise<void>;
}) {
  const [timeout, setTimeoutValue] = useState(String(provider.timeoutSeconds));
  const [busy, setBusy] = useState(false);
  useEffect(() => setTimeoutValue(String(provider.timeoutSeconds)), [provider.timeoutSeconds]);
  const wrap = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <tr>
      <td>{provider.name} <Code>{provider.key}</Code>{!provider.implemented && <Chip $tone="bad">אין מימוש בשרת</Chip>}</td>
      <td>
        <Toggle
          aria-label={`ספק ${provider.name} פעיל`}
          checked={provider.enabled}
          disabled={busy}
          onChange={(e) => void wrap(() => onUpdate(provider.key, { enabled: e.target.checked }))}
        />
      </td>
      <td>
        {provider.credentialsConfigured
          ? <Chip $tone="ok">מוגדר בשרת</Chip>
          : <Chip $tone="bad">חסר: <Code>{provider.credentialsSource}</Code></Chip>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Input
            aria-label={`זמן המתנה ${provider.name}`}
            type="number" min={5} max={600} value={timeout} style={{ width: '6rem' }}
            onChange={(e) => setTimeoutValue(e.target.value)}
          />
          <Btn
            type="button" $variant="secondary"
            disabled={busy || Number(timeout) === provider.timeoutSeconds}
            onClick={() => void wrap(() => onUpdate(provider.key, { timeoutSeconds: Number(timeout) }))}
          >
            שמירה
          </Btn>
        </div>
      </td>
      <td><Chips>{provider.supportedCapabilities.map((c) => <Chip key={c}>{capLabel(c)}</Chip>)}</Chips></td>
      <td>
        <Btn type="button" $variant="secondary" disabled={busy || !provider.credentialsConfigured} onClick={() => void wrap(() => onDiscover(provider.key))}>
          <Search size={14} /> גילוי מודלים
        </Btn>
      </td>
    </tr>
  );
}

function ModelForm({ initial, isNew, providers, capabilityKeys, onCancel, onSave }: {
  initial: AiModelUpsert;
  isNew: boolean;
  providers: AiProvider[];
  capabilityKeys: string[];
  onCancel: () => void;
  onSave: (value: AiModelUpsert) => Promise<string | null>;
}) {
  const [value, setValue] = useState<AiModelUpsert>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const num = (s: string) => (s.trim() === '' ? null : Number(s));

  const submit = async () => {
    if (!value.displayName.trim()) { setError('שם תצוגה הוא שדה חובה.'); return; }
    if (isNew && !(value.modelKey ?? '').trim()) { setError('מזהה המודל הוא שדה חובה.'); return; }
    if (value.capabilities.length === 0) { setError('בחרו לפחות יכולת אחת.'); return; }
    setBusy(true);
    setError(await onSave(value));
    setBusy(false);
  };

  return (
    <Overlay>
      <Dialog role="dialog" aria-modal="true" aria-label={isNew ? 'הוספת מודל' : 'עריכת מודל'}>
        <CardTitle>{isNew ? 'הוספת מודל לקטלוג' : 'עריכת מודל'}</CardTitle>
        {error && <Banner $tone="bad" role="alert"><XCircle size={18} /> {error}</Banner>}
        <FieldRow>
          {isNew && (
            <Label>
              ספק
              <Select value={value.providerKey} onChange={(e) => setValue({ ...value, providerKey: e.target.value })}>
                {providers.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </Select>
            </Label>
          )}
          {isNew && (
            <Label>
              מזהה המודל אצל הספק
              <Input dir="ltr" value={value.modelKey ?? ''} onChange={(e) => setValue({ ...value, modelKey: e.target.value })} placeholder="claude-sonnet-5-5" />
            </Label>
          )}
          <Label>
            שם תצוגה
            <Input value={value.displayName} onChange={(e) => setValue({ ...value, displayName: e.target.value })} />
          </Label>
        </FieldRow>
        <Label style={{ marginBottom: '0.75rem' }}>
          יכולות
          <Chips>
            {capabilityKeys.map((c) => (
              <label key={c} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={value.capabilities.includes(c)}
                  onChange={(e) => setValue({
                    ...value,
                    capabilities: e.target.checked ? [...value.capabilities, c] : value.capabilities.filter((x) => x !== c),
                  })}
                />
                {capLabel(c)}
              </label>
            ))}
          </Chips>
        </Label>
        <FieldRow>
          <Label>טוקנים מקס' בקלט<Input type="number" min={1} value={value.maxInputTokens ?? ''} onChange={(e) => setValue({ ...value, maxInputTokens: num(e.target.value) })} /></Label>
          <Label>טוקנים מקס' בפלט<Input type="number" min={1} value={value.maxOutputTokens ?? ''} onChange={(e) => setValue({ ...value, maxOutputTokens: num(e.target.value) })} /></Label>
          <Label>
            מאמץ (Claude)
            <Select value={value.effort ?? ''} onChange={(e) => setValue({ ...value, effort: e.target.value || null })}>
              <option value="">ברירת המחדל של המודל</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </Select>
          </Label>
        </FieldRow>
        <FieldRow>
          <Label>מחיר קלט ל-1M ($)<Input type="number" min={0} step="0.01" value={value.inputPricePerMTok ?? ''} onChange={(e) => setValue({ ...value, inputPricePerMTok: num(e.target.value) })} /></Label>
          <Label>מחיר פלט ל-1M ($)<Input type="number" min={0} step="0.01" value={value.outputPricePerMTok ?? ''} onChange={(e) => setValue({ ...value, outputPricePerMTok: num(e.target.value) })} /></Label>
          <Label>מחיר קלט מהמטמון ל-1M ($)<Input type="number" min={0} step="0.01" value={value.cachedInputPricePerMTok ?? ''} onChange={(e) => setValue({ ...value, cachedInputPricePerMTok: num(e.target.value) })} /></Label>
        </FieldRow>
        <Label>
          הערות
          <Input value={value.notes ?? ''} maxLength={500} onChange={(e) => setValue({ ...value, notes: e.target.value })} />
        </Label>
        <label style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.875rem' }}>
          <input type="checkbox" checked={value.enabled} onChange={(e) => setValue({ ...value, enabled: e.target.checked })} />
          פעיל (אפשר לבחור אותו)
        </label>
        <Actions>
          <Btn type="button" disabled={busy} onClick={() => void submit()}><Save size={16} /> שמירה</Btn>
          <Btn type="button" $variant="secondary" disabled={busy} onClick={onCancel}>ביטול</Btn>
        </Actions>
      </Dialog>
    </Overlay>
  );
}
