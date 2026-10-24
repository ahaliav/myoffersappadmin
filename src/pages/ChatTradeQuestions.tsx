import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Plus, Save, X } from 'lucide-react';
import {
  chatTradeQuestionsApi, quoteChatSettingsApi, type QuoteChatSettings, type TradeQuestion, type TradeQuestionInput,
} from '../api/chatTradeQuestionsApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.5rem; font-size: 0.875rem; line-height: 1.6;`;
const Btn = styled.button<{ $secondary?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.9rem;
  background: ${({ $secondary }) => ($secondary ? '#f1f5f9' : '#3b82f6')};
  color: ${({ $secondary }) => ($secondary ? '#334155' : 'white')};
  border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Card = styled.div`
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem 1.25rem; margin-bottom: 0.75rem;
`;
const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem 0.75rem;`;
const Label = styled.label`display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #475569;`;
const Input = styled.input`
  padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;
  &:focus { outline: none; border-color: #3b82f6; }
`;
const Row = styled.div`display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; margin-top: 0.75rem;`;
const Muted = styled.span`color: #64748b; font-size: 0.8rem;`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.875rem;`;

const SWITCHES: Record<string, string> = {
  qc_enabled: "הצ'אט פתוח (off / on / users:12,34 לפיילוט)",
  qc_photos: 'תמונות לפריטים',
  qc_trade_questions: 'שאלות לפי מקצוע',
  qc_ai_descriptions: 'תיאורי פריטים שה-AI כותב (לא נשמרים לקטלוג)',
};

/** The chat's switches: each change applies at once and is kept in the history. */
function Switches() {
  const [data, setData] = useState<QuoteChatSettings | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data: d } = await quoteChatSettingsApi.get();
      setData(d);
      setValues(Object.fromEntries(d.settings.map((s) => [s.key, s.value])));
    } catch (e) { setError(message(e)); }
  };
  useEffect(() => { void load(); }, []);

  const save = async (key: string) => {
    setSaving(key);
    setError(null);
    try { await quoteChatSettingsApi.set(key, values[key]?.trim() ?? ''); await load(); }
    catch (e) { setError(message(e)); }
    finally { setSaving(null); }
  };

  if (!data) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  return (
    <Card aria-label="מתגי הצ'אט">
      <strong>מתגים</strong>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <Grid>
        {data.settings.map((s) => (
          <Label key={s.key}>
            {SWITCHES[s.key] ?? s.key}
            <Input dir="ltr" value={values[s.key] ?? ''} onChange={(e) => setValues((p) => ({ ...p, [s.key]: e.target.value }))} aria-label={s.key} />
            <Row style={{ marginTop: 0 }}>
              {s.updatedBy && <Muted>{s.updatedBy}</Muted>}
              <Btn type="button" disabled={saving === s.key || values[s.key] === s.value} onClick={() => void save(s.key)}>שמירה</Btn>
            </Row>
          </Label>
        ))}
      </Grid>
    </Card>
  );
}

const EMPTY: TradeQuestionInput = {
  trade: '*', itemKeyword: '', detailKey: '', questionHe: '{{item}}: ', optionsSource: 'fixed:|לא רלוונטי',
  required: true, sortOrder: 0, isActive: true,
};

function message(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'שגיאה בשמירה';
}

function Form({ value, onChange }: { value: TradeQuestionInput; onChange: (v: TradeQuestionInput) => void }) {
  const set = <K extends keyof TradeQuestionInput>(k: K, v: TradeQuestionInput[K]) => onChange({ ...value, [k]: v });
  return (
    <Grid>
      <Label>מקצוע (* = כולם)<Input value={value.trade} onChange={(e) => set('trade', e.target.value)} /></Label>
      <Label>מילת מפתח בשם הפריט (חלופות עם |)<Input value={value.itemKeyword} onChange={(e) => set('itemKeyword', e.target.value)} /></Label>
      <Label>מפתח הפרט (באנגלית)<Input dir="ltr" value={value.detailKey} onChange={(e) => set('detailKey', e.target.value)} /></Label>
      <Label>השאלה ({'{{item}}'} = שם הפריט)<Input value={value.questionHe} onChange={(e) => set('questionHe', e.target.value)} /></Label>
      <Label>
        כפתורים (fixed:א|ב|ג, ריק = תשובה חופשית)
        <Input value={value.optionsSource ?? ''} onChange={(e) => set('optionsSource', e.target.value || null)} />
      </Label>
      <Label>סדר<Input type="number" value={value.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value) || 0)} /></Label>
      <Label>
        <span><input type="checkbox" checked={value.required} onChange={(e) => set('required', e.target.checked)} /> חובה (רק שאלות חובה נשאלות)</span>
      </Label>
      <Label>
        <span><input type="checkbox" checked={value.isActive} onChange={(e) => set('isActive', e.target.checked)} /> פעילה</span>
      </Label>
    </Grid>
  );
}

export default function ChatTradeQuestions() {
  const [list, setList] = useState<TradeQuestion[]>([]);
  const [editing, setEditing] = useState<Record<number, TradeQuestionInput>>({});
  const [draft, setDraft] = useState<TradeQuestionInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setList((await chatTradeQuestionsApi.list()).data); }
    catch (e) { setError(message(e)); }
  };
  useEffect(() => { void load(); }, []);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await work(); await load(); return true; }
    catch (e) { setError(message(e)); return false; }
    finally { setBusy(false); }
  };

  const stopEditing = (id: number) => setEditing((p) => { const n = { ...p }; delete n[id]; return n; });

  return (
    <PageWrap>
      <Title>צ'אט הצעה (A1): מתגים ושאלות לפי מקצוע</Title>
      <Desc>
        הצ'אט שואל את השאלות האלה מילה במילה על פריט ששמו כולל את מילת המפתח (למשל "צביעת דירה" ← "כמה חדרים?"),
        והתשובה נכנסת להערה של הפריט. נשאלות רק שאלות חובה ופעילות, ורק כשההגדרה qc_trade_questions דולקת.
      </Desc>
      <Switches />
      {error && <ErrorText role="alert">{error}</ErrorText>}

      {draft ? (
        <Card>
          <Form value={draft} onChange={setDraft} />
          <Row>
            <Btn $secondary type="button" onClick={() => setDraft(null)}><X size={16} /> ביטול</Btn>
            <Btn type="button" disabled={busy} onClick={async () => { if (await run(() => chatTradeQuestionsApi.create(draft))) setDraft(null); }}>
              <Save size={16} /> שמירה
            </Btn>
          </Row>
        </Card>
      ) : (
        <Row style={{ justifyContent: 'flex-start', marginBottom: '1rem' }}>
          <Btn type="button" onClick={() => setDraft(EMPTY)}><Plus size={16} /> שאלה חדשה</Btn>
        </Row>
      )}

      {list.map((q) => {
        const edit = editing[q.id];
        return (
          <Card key={q.id} aria-label={q.questionHe}>
            {edit ? (
              <>
                <Form value={edit} onChange={(v) => setEditing((p) => ({ ...p, [q.id]: v }))} />
                <Row>
                  <Btn $secondary type="button" onClick={() => stopEditing(q.id)}><X size={16} /> ביטול</Btn>
                  <Btn type="button" disabled={busy} onClick={async () => { if (await run(() => chatTradeQuestionsApi.update(q.id, edit))) stopEditing(q.id); }}>
                    <Save size={16} /> שמירה
                  </Btn>
                </Row>
              </>
            ) : (
              <>
                <strong>{q.questionHe}</strong>
                <div>
                  <Muted>
                    {q.trade === '*' ? 'כל המקצועות' : q.trade} · "{q.itemKeyword}" · {q.detailKey} · {q.optionsSource ?? 'תשובה חופשית'}
                    {q.required ? '' : ' · לא חובה'}{q.isActive ? '' : ' · כבויה'}
                  </Muted>
                </div>
                <Row>
                  <Btn $secondary type="button" onClick={() => setEditing((p) => ({ ...p, [q.id]: { ...q } }))}>עריכה</Btn>
                  {q.isActive && <Btn $secondary type="button" disabled={busy} onClick={() => void run(() => chatTradeQuestionsApi.deactivate(q.id))}>כיבוי</Btn>}
                </Row>
              </>
            )}
          </Card>
        );
      })}
    </PageWrap>
  );
}
