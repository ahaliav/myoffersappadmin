import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Save, X } from 'lucide-react';
import { tagQuestionsApi, type TagQuestion, type TagQuestionInput } from '../api/chatTradeQuestionsApi';

// AI-17: the quote chat's tag questions ("תיוג ומעקב"). Which are asked, in what order, required or not, and when. The
// options are the new-customer form's lists (סוג לקוח, הגיע אליי מ, מצב הקשר) as each user has them. The line under the
// question and the skip word are ui_texts chat.tag_hint / chat.tag_skip (עריכה במסך הטקסטים).

const Card = styled.div`background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem 1.25rem; margin-bottom: 0.75rem;`;
const Btn = styled.button<{ $secondary?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem;
  background: ${({ $secondary }) => ($secondary ? '#f1f5f9' : '#3b82f6')}; color: ${({ $secondary }) => ($secondary ? '#334155' : 'white')};
  border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Label = styled.label`display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #475569; margin-top: 0.5rem;`;
const Input = styled.input`padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;`;
const Select = styled.select`padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;`;
const Row = styled.div`display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; margin-top: 0.6rem; flex-wrap: wrap;`;
const Muted = styled.p`color: #64748b; font-size: 0.8rem; margin: 0.25rem 0 0; line-height: 1.5;`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.85rem;`;

export const FIELD_LABELS: Record<TagQuestion['field'], string> = {
  client_type: 'סוג הלקוח',
  customer_source: 'הגיע אליי מ',
  contact_status: 'מצב הקשר',
};
const TIMING_LABELS: Record<TagQuestion['timing'], string> = { after_draft: 'אחרי שההצעה מוכנה', before_draft: 'לפני ההצעה' };
const AUDIENCE_LABELS: Record<TagQuestion['audience'], string> = { new_client: 'רק ללקוח חדש', all: 'לכל לקוח (מה שחסר בכרטיס)' };

function message(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'שגיאה בשמירה';
}

const input = (t: TagQuestion): TagQuestionInput => ({
  questionHe: t.questionHe, required: t.required, sortOrder: t.sortOrder, timing: t.timing, audience: t.audience, isActive: t.isActive,
});

function Form({ value, onChange }: { value: TagQuestionInput; onChange: (v: TagQuestionInput) => void }) {
  return (
    <>
      <Label>נוסח השאלה ({'{{name}}'} = שם הלקוח)
        <Input value={value.questionHe} onChange={(e) => onChange({ ...value, questionHe: e.target.value })} aria-label="נוסח השאלה" />
      </Label>
      <Label>מתי נשאלת
        <Select value={value.timing} onChange={(e) => onChange({ ...value, timing: e.target.value as TagQuestion['timing'] })} aria-label="מתי נשאלת">
          {Object.entries(TIMING_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </Label>
      <Label>למי
        <Select value={value.audience} onChange={(e) => onChange({ ...value, audience: e.target.value as TagQuestion['audience'] })} aria-label="למי">
          {Object.entries(AUDIENCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </Label>
      <Label>סדר
        <Input type="number" min={0} value={value.sortOrder} onChange={(e) => onChange({ ...value, sortOrder: Number(e.target.value) })} aria-label="סדר" />
      </Label>
      <Label><span><input type="checkbox" checked={value.required} onChange={(e) => onChange({ ...value, required: e.target.checked })} aria-label="חובה" /> חובה (בלי כפתור דלג)</span></Label>
      <Label><span><input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} aria-label="נשאלת" /> נשאלת</span></Label>
    </>
  );
}

export default function TagQuestionsSection() {
  const [list, setList] = useState<TagQuestion[]>([]);
  const [editing, setEditing] = useState<Record<string, TagQuestionInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setList((await tagQuestionsApi.list()).data); } catch (e) { setError(message(e)); }
  };
  useEffect(() => { void load(); }, []);

  const save = async (field: string, body: TagQuestionInput) => {
    setBusy(true);
    setError(null);
    try {
      await tagQuestionsApi.update(field, body);
      setEditing((p) => { const n = { ...p }; delete n[field]; return n; });
      await load();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };

  return (
    <Card aria-label="שאלות תיוג">
      <strong>שאלות תיוג (סוג לקוח, הגיע אליי מ, מצב הקשר)</strong>
      <Muted>
        האפשרויות הן הרשימות של טופס לקוח חדש, כמו שהן אצל כל משתמש. מה שנכתב בהודעה, או שכבר יש בכרטיס של לקוח קיים, לא נשאל.
        השורה שמתחת לשאלה ומילת הדילוג הן הטקסטים chat.tag_hint ו-chat.tag_skip.
      </Muted>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {list.map((t) => {
        const edit = editing[t.field];
        return (
          <div key={t.field} aria-label={`שאלת תיוג: ${FIELD_LABELS[t.field] ?? t.field}`} style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
            <strong>{t.sortOrder}. {FIELD_LABELS[t.field] ?? t.field}</strong>{t.isActive ? '' : ' · לא נשאלת'}
            {edit ? (
              <>
                <Form value={edit} onChange={(v) => setEditing((p) => ({ ...p, [t.field]: v }))} />
                <Row>
                  <Btn $secondary type="button" onClick={() => setEditing((p) => { const n = { ...p }; delete n[t.field]; return n; })}><X size={16} /> ביטול</Btn>
                  <Btn type="button" disabled={busy} onClick={() => void save(t.field, edit)}><Save size={16} /> שמירה</Btn>
                </Row>
              </>
            ) : (
              <>
                <Muted>{t.questionHe}</Muted>
                <Muted>{TIMING_LABELS[t.timing] ?? t.timing} · {AUDIENCE_LABELS[t.audience] ?? t.audience} · {t.required ? 'חובה' : 'עם דלג'}</Muted>
                <Row>
                  <Btn $secondary type="button" onClick={() => setEditing((p) => ({ ...p, [t.field]: input(t) }))}>עריכה</Btn>
                </Row>
              </>
            )}
          </div>
        );
      })}
    </Card>
  );
}
