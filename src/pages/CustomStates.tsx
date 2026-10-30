import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { History, Pencil, Plus, Save, Trash2, Users, X } from 'lucide-react';
import {
  customStatesApi,
  type CustomCondition,
  type CustomField,
  type CustomState,
  type CustomStateInput,
  type CustomStatesData,
  type DotPolicy,
  type RecipeStep,
  type StepType,
} from '../api/customStatesApi';

const Wrap = styled.div`direction: rtl; text-align: right;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1rem; font-size: 0.875rem; line-height: 1.6;`;
const Card = styled.div<{ $off?: boolean }>`
  background: ${({ $off }) => ($off ? '#f8fafc' : '#fff')}; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; margin-bottom: 0.6rem;
  opacity: ${({ $off }) => ($off ? 0.75 : 1)};
`;
const Row = styled.div`display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;`;
const Name = styled.strong`font-size: 1rem; color: #0f172a;`;
const Key = styled.code`font-size: 0.78rem; color: #475569; direction: ltr;`;
const Muted = styled.span`color: #64748b; font-size: 0.8rem;`;
const Line = styled.p`margin: 0.35rem 0; color: #1e293b; font-size: 0.9rem;`;
const Chip = styled.span`background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.78rem;`;
const Input = styled.input`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; min-width: 90px; font-family: inherit;`;
const Area = styled.textarea`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; width: 100%; font-family: inherit;`;
const Select = styled.select`padding: 0.4rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; background: #fff; font-family: inherit;`;
const Label = styled.label`display: block; font-size: 0.8125rem; font-weight: 500; color: #475569; margin: 0.6rem 0 0.25rem;`;
const Btn = styled.button<{ $secondary?: boolean; $danger?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
  background: ${({ $secondary, $danger }) => ($danger ? '#fef2f2' : $secondary ? '#f1f5f9' : '#3b82f6')};
  color: ${({ $secondary, $danger }) => ($danger ? '#b91c1c' : $secondary ? '#334155' : '#fff')};
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Form = styled.div`background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;`;
const Errors = styled.ul`color: #b91c1c; font-size: 0.875rem; margin: 0.5rem 0; padding-inline-start: 1.2rem;`;
const Count = styled.p`color: #047857; font-weight: 600; font-size: 0.9rem; margin: 0.5rem 0;`;
const Group = styled.div`border-top: 1px dashed #e2e8f0; margin-top: 0.75rem; padding-top: 0.25rem;`;

const DOTS: Record<DotPolicy, string> = {
  yes: 'כן (בכל כניסה למצב, ושוב אחרי 7 ימים)',
  once: 'פעם אחת',
  once_a_year: 'פעם בשנה',
  no: 'בלי נקודה',
};

const STEPS: Record<StepType, string> = {
  message: 'ניסוח הודעה ללקוח',
  prep_call: 'הכנה לשיחה',
  consult: 'התייעצות עם הסוכן',
  reminder: 'תזכורת בעוד כמה ימים',
};

const ACTIONS: Record<string, string> = { create: 'נוצר', update: 'עודכן', delete: 'נמחק' };

const emptyState = (): CustomStateInput => ({
  key: '', name: '', line: '', conditions: [{ field: 'customer_source', op: 'eq', value: '' }], dot: 'yes', urgency: 20, isActive: true,
  recipe: { label: '', steps: [] },
});

function errorsOf(e: unknown): string[] {
  const err = e as { response?: { data?: { message?: string; errors?: string[] } } };
  const data = err.response?.data;
  return data?.errors?.length ? data.errors : [data?.message ?? 'השמירה נכשלה'];
}

/** What is sent: a recipe with no label and no steps is no recipe. */
function toInput(f: CustomStateInput): CustomStateInput {
  const recipe = f.recipe && (f.recipe.label.trim() || f.recipe.steps.length) ? f.recipe : null;
  return { ...f, recipe };
}

/**
 * E12 "מצבים מותאמים": the admin builds a customer state with no developer — conditions on the registry's fields (all must
 * hold), the line the agent shows, the orange dot, where it sits among the 20 built-in states, and a recipe: one button that
 * runs ready steps as a preview the user approves. "בדוק" counts the customers it fits right now, across every business.
 */
export default function CustomStates() {
  const [data, setData] = useState<CustomStatesData | null>(null);
  const [form, setForm] = useState<CustomStateInput | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [count, setCount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => customStatesApi.get().then(setData).catch(() => setLoadError('לא הצלחתי לטעון את המצבים'));
  useEffect(() => { void load(); }, []);

  if (!data) return <Wrap>{loadError ? <Errors role="alert"><li>{loadError}</li></Errors> : <Muted>טוען…</Muted>}</Wrap>;

  const fieldOf = (key: string): CustomField | undefined => data.fields.find((f) => f.key === key);
  const opLabel = (op: string) => data.ops[op] ?? op;
  const urgencyLabel = (n: number) => (n === 0 ? 'לפני כל המצבים' : `אחרי "${data.builtIns.find((b) => b.order === n)?.name ?? n}"`);
  const describe = (c: CustomCondition) => {
    const f = fieldOf(c.field);
    const value = f?.type === 'bool' ? (c.value === 'true' ? 'כן' : 'לא') : c.value;
    return `${f?.label ?? c.field} ${opLabel(c.op)} ${value}${f?.unit && f.type === 'number' ? ` ${f.unit}` : ''}`;
  };

  const open = (s?: CustomState) => {
    setErrors([]);
    setCount(null);
    setEditingId(s?.id ?? null);
    setForm(s
      ? { key: s.key, name: s.name, line: s.line, conditions: s.conditions.map((c) => ({ ...c })), dot: s.dot, urgency: s.urgency, isActive: s.isActive,
          recipe: s.recipe ? { label: s.recipe.label, steps: s.recipe.steps.map((x) => ({ ...x })) } : { label: '', steps: [] } }
      : emptyState());
  };

  const patch = (p: Partial<CustomStateInput>) => setForm((f) => (f ? { ...f, ...p } : f));
  const setCondition = (i: number, p: Partial<CustomCondition>) =>
    patch({ conditions: form!.conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const setStep = (i: number, p: Partial<RecipeStep>) =>
    patch({ recipe: { ...form!.recipe!, steps: form!.recipe!.steps.map((s, j) => (j === i ? { ...s, ...p } : s)) } });

  const preview = async (conditions: CustomCondition[]) => {
    try {
      setCount((await customStatesApi.preview(conditions)).text);
      return true;
    } catch (e) {
      setErrors(errorsOf(e));
      return false;
    }
  };

  const check = async () => {
    if (!form) return;
    setBusy(true);
    setErrors([]);
    setCount(null);
    await preview(form.conditions);
    setBusy(false);
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setErrors([]);
    setCount(null);
    try {
      const body = toInput(form);
      if (editingId == null) await customStatesApi.create(body); else await customStatesApi.update(editingId, body);
      await preview(form.conditions);
      setForm(null);
      setEditingId(null);
      await load();
    } catch (e) {
      setErrors(errorsOf(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (s: CustomState) => {
    setBusy(true);
    try {
      await customStatesApi.update(s.id, { key: s.key, name: s.name, line: s.line, conditions: s.conditions, dot: s.dot, urgency: s.urgency, isActive: !s.isActive, recipe: s.recipe });
      await load();
    } catch (e) {
      setErrors(errorsOf(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: CustomState) => {
    if (!window.confirm(`למחוק את "${s.name}"? ההיסטוריה נשמרת. אפשר גם לכבות במקום למחוק.`)) return;
    setBusy(true);
    try {
      await customStatesApi.remove(s.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <Desc>
        מצב חדש בלי מפתח: בוחרים שדה, פעולה וערך (כל התנאים צריכים להתקיים), כותבים מה הסוכן אומר, אם יש נקודה כתומה ואיפה המצב
        עומד ביחס ל-20 המצבים המובנים. המתכון הוא כפתור אחד על המצב: צעדים מוכנים של הסוכן, תמיד כתצוגה מקדימה שהמשתמש מאשר.
        שמירה חלה מיד ונשמרת בהיסטוריה.
      </Desc>

      {!form && <Btn type="button" onClick={() => open()}><Plus size={14} /> מצב חדש</Btn>}
      {!form && count && <Count role="status">נשמר. {count}</Count>}
      {!form && errors.length > 0 && <Errors role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</Errors>}

      {form && (
        <Form aria-label="עריכת מצב">
          <Row>
            <div>
              <Label htmlFor="cs-name">שם המצב</Label>
              <Input id="cs-name" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="ליד מפייסבוק בלי הצעה" />
            </div>
            <div>
              <Label htmlFor="cs-key">מפתח (אנגלית)</Label>
              <Input id="cs-key" dir="ltr" value={form.key} disabled={editingId != null} onChange={(e) => patch({ key: e.target.value })} placeholder="fb_no_quote" />
            </div>
          </Row>
          <Label htmlFor="cs-line">מה הסוכן אומר (שורת המצב · {'{{name}}'} = שם הלקוח)</Label>
          <Area id="cs-line" rows={2} value={form.line} onChange={(e) => patch({ line: e.target.value })} />

          <Group>
            <Label as="div">תנאים (כולם צריכים להתקיים)</Label>
            {form.conditions.map((c, i) => {
              const f = fieldOf(c.field);
              return (
                <Row key={i} style={{ marginBottom: '0.4rem' }}>
                  <Select aria-label={`שדה ${i + 1}`} value={c.field}
                    onChange={(e) => {
                      const next = fieldOf(e.target.value);
                      setCondition(i, { field: e.target.value, op: next?.ops[0] ?? 'eq', value: next?.type === 'bool' ? 'true' : '' });
                    }}>
                    {data.fields.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </Select>
                  <Select aria-label={`פעולה ${i + 1}`} value={c.op} onChange={(e) => setCondition(i, { op: e.target.value })}>
                    {(f?.ops ?? []).map((op) => <option key={op} value={op}>{opLabel(op)}</option>)}
                  </Select>
                  {f?.type === 'bool' ? (
                    <Select aria-label={`ערך ${i + 1}`} value={c.value} onChange={(e) => setCondition(i, { value: e.target.value })}>
                      <option value="true">כן</option>
                      <option value="false">לא</option>
                    </Select>
                  ) : (
                    <Input aria-label={`ערך ${i + 1}`} value={c.value} inputMode={f?.type === 'number' ? 'decimal' : undefined}
                      onChange={(e) => setCondition(i, { value: e.target.value })} />
                  )}
                  {f?.unit && <Muted>{f.unit}</Muted>}
                  <Btn type="button" $secondary aria-label={`הסר תנאי ${i + 1}`} onClick={() => patch({ conditions: form.conditions.filter((_, j) => j !== i) })}><X size={14} /></Btn>
                </Row>
              );
            })}
            <Btn type="button" $secondary onClick={() => patch({ conditions: [...form.conditions, { field: 'quotes_count', op: 'eq', value: '' }] })}>
              <Plus size={14} /> תנאי
            </Btn>
          </Group>

          <Group>
            <Row>
              <div>
                <Label htmlFor="cs-dot">נקודה כתומה</Label>
                <Select id="cs-dot" value={form.dot} onChange={(e) => patch({ dot: e.target.value as DotPolicy })}>
                  {(Object.keys(DOTS) as DotPolicy[]).map((d) => <option key={d} value={d}>{DOTS[d]}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="cs-urgency">דחיפות (מקום בין המצבים)</Label>
                <Select id="cs-urgency" value={form.urgency} onChange={(e) => patch({ urgency: Number(e.target.value) })}>
                  <option value={0}>{urgencyLabel(0)}</option>
                  {data.builtIns.map((b) => <option key={b.order} value={b.order}>{b.order}. {urgencyLabel(b.order)}</option>)}
                </Select>
              </div>
              <label style={{ marginTop: '1.4rem' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} /> פעיל
              </label>
            </Row>
          </Group>

          <Group>
            <Label htmlFor="cs-recipe">מתכון: שם הכפתור על המצב (ריק = בלי מתכון)</Label>
            <Input id="cs-recipe" value={form.recipe?.label ?? ''} placeholder="בקשת תמונות"
              onChange={(e) => patch({ recipe: { ...(form.recipe ?? { steps: [] }), label: e.target.value } })} />
            {(form.recipe?.steps ?? []).map((s, i) => (
              <Row key={i} style={{ margin: '0.4rem 0' }}>
                <Muted>צעד {i + 1}</Muted>
                <Select aria-label={`סוג צעד ${i + 1}`} value={s.type}
                  onChange={(e) => setStep(i, { type: e.target.value as StepType, days: e.target.value === 'reminder' ? s.days ?? 3 : null })}>
                  {data.stepTypes.map((t) => <option key={t} value={t}>{STEPS[t] ?? t}</option>)}
                </Select>
                {s.type === 'reminder' ? (
                  <>
                    <Muted>בעוד</Muted>
                    <Input aria-label={`ימים ${i + 1}`} type="number" min={1} max={60} style={{ width: 70, minWidth: 70 }} value={s.days ?? ''}
                      onChange={(e) => setStep(i, { days: e.target.value === '' ? null : Number(e.target.value) })} />
                    <Muted>ימים</Muted>
                    <Input aria-label={`טקסט תזכורת ${i + 1}`} placeholder="טקסט (לא חובה)" value={s.text ?? ''} onChange={(e) => setStep(i, { text: e.target.value })} />
                  </>
                ) : (
                  <Input aria-label={`נושא ${i + 1}`} placeholder={s.type === 'message' ? 'נושא ההודעה, למשל בקשת תמונות' : 'על מה (לא חובה)'} value={s.topic ?? ''}
                    onChange={(e) => setStep(i, { topic: e.target.value })} />
                )}
                <Btn type="button" $secondary aria-label={`הסר צעד ${i + 1}`}
                  onClick={() => patch({ recipe: { ...form.recipe!, steps: form.recipe!.steps.filter((_, j) => j !== i) } })}><X size={14} /></Btn>
              </Row>
            ))}
            <Btn type="button" $secondary disabled={(form.recipe?.steps.length ?? 0) >= 3}
              onClick={() => patch({ recipe: { label: form.recipe?.label ?? '', steps: [...(form.recipe?.steps ?? []), { type: 'message', topic: '' }] } })}>
              <Plus size={14} /> צעד
            </Btn>
            <Muted style={{ display: 'block', marginTop: '0.3rem' }}>
              צעד שיחה אחד (הודעה, הכנה לשיחה או התייעצות) ועוד תזכורת. שום דבר לא נשלח ולא נשמר בלי אישור המשתמש.
            </Muted>
          </Group>

          {errors.length > 0 && <Errors role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</Errors>}
          {count && <Count role="status">{count}</Count>}
          <Row style={{ marginTop: '0.75rem' }}>
            <Btn type="button" onClick={() => void save()} disabled={busy}><Save size={14} /> שמירה</Btn>
            <Btn type="button" $secondary onClick={() => void check()} disabled={busy}><Users size={14} /> כמה לקוחות מתאימים?</Btn>
            <Btn type="button" $secondary onClick={() => { setForm(null); setErrors([]); setCount(null); }} disabled={busy}>ביטול</Btn>
          </Row>
        </Form>
      )}

      {data.states.length === 0 && !form && <Desc style={{ marginTop: '1rem' }}>עוד אין מצבים מותאמים.</Desc>}
      {data.states.map((s) => (
        <Card key={s.id} $off={!s.isActive}>
          <Row>
            <Name>{s.name}</Name>
            <Key>{s.key}</Key>
            {!s.isActive && <Chip style={{ background: '#f1f5f9', color: '#64748b' }}>כבוי</Chip>}
            <span style={{ flex: 1 }} />
            <label><input type="checkbox" aria-label={`פעיל ${s.name}`} checked={s.isActive} disabled={busy} onChange={() => void toggle(s)} /> פעיל</label>
            <Btn type="button" $secondary onClick={() => open(s)}><Pencil size={14} /> עריכה</Btn>
            <Btn type="button" $secondary onClick={() => setHistoryOf(historyOf === s.key ? null : s.key)}><History size={14} /> היסטוריה</Btn>
            <Btn type="button" $danger onClick={() => void remove(s)} disabled={busy}><Trash2 size={14} /> מחיקה</Btn>
          </Row>
          <Line>{s.line}</Line>
          <Row>
            {s.conditions.map((c, i) => <Chip key={i}>{describe(c)}</Chip>)}
          </Row>
          <Row style={{ marginTop: '0.4rem' }}>
            <Muted>נקודה: {DOTS[s.dot] ?? s.dot}</Muted>
            <Muted>· דחיפות: {urgencyLabel(s.urgency)}</Muted>
            {s.recipe && <Muted>· כפתור: "{s.recipe.label}" ({s.recipe.steps.map((x) => (x.type === 'reminder' ? `תזכורת בעוד ${x.days} ימים` : `${STEPS[x.type]}${x.topic ? `: ${x.topic}` : ''}`)).join(' + ')})</Muted>}
          </Row>
          {historyOf === s.key && (
            <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '1.2rem', fontSize: '0.8rem', color: '#475569' }}>
              {data.history.filter((h) => h.key === s.key).map((h) => (
                <li key={h.id}>
                  {ACTIONS[h.action] ?? h.action} · {new Date(h.changedAt).toLocaleString('he-IL')} · {h.changedBy ?? '—'}
                  {h.snapshot.conditions && <> · {h.snapshot.conditions.map(describe).join(' · ')}</>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </Wrap>
  );
}
