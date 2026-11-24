import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Plus, Save, X } from 'lucide-react';
import { tradeTermsApi, type TradeTerm, type TradeTermInput } from '../api/chatTradeQuestionsApi';

// AI-12: the words of each trade. Sent with the user's own dictionary as {{trade_terms}} to extract_work_items and
// quote_chat_ask, so the model can tell a typo ("פרופסים") from a known word ("פרופילים"). The prompt owner decides
// where {{trade_terms}} goes in the prompt; the switches and the cap are above (qc_trade_terms_*).

const Card = styled.div`background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem 1.25rem; margin-bottom: 0.75rem;`;
const Btn = styled.button<{ $secondary?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem;
  background: ${({ $secondary }) => ($secondary ? '#f1f5f9' : '#3b82f6')}; color: ${({ $secondary }) => ($secondary ? '#334155' : 'white')};
  border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Label = styled.label`display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #475569; margin-top: 0.5rem;`;
const Input = styled.input`padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;`;
const Area = styled.textarea`padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; min-height: 4.5rem; font-family: inherit;`;
const Row = styled.div`display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; margin-top: 0.6rem;`;
const Muted = styled.p`color: #64748b; font-size: 0.8rem; margin: 0.25rem 0 0; line-height: 1.5;`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.85rem;`;

const EMPTY: TradeTermInput = { trade: '', terms: '', isActive: true };

function message(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'שגיאה בשמירה';
}

function Form({ value, onChange }: { value: TradeTermInput; onChange: (v: TradeTermInput) => void }) {
  return (
    <>
      <Label>מקצוע (ריק או * = כולם; אחרת כשהמקצוע של המשתמש כולל את המילה)
        <Input value={value.trade} onChange={(e) => onChange({ ...value, trade: e.target.value })} aria-label="מקצוע" />
      </Label>
      <Label>מילים (מופרדות בפסיק או בשורה חדשה)
        <Area value={value.terms} onChange={(e) => onChange({ ...value, terms: e.target.value })} aria-label="מילים" />
      </Label>
      <Label><span><input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} /> פעילה</span></Label>
    </>
  );
}

export default function TradeTermsSection() {
  const [list, setList] = useState<TradeTerm[]>([]);
  const [draft, setDraft] = useState<TradeTermInput | null>(null);
  const [editing, setEditing] = useState<Record<number, TradeTermInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setList((await tradeTermsApi.list()).data); } catch (e) { setError(message(e)); }
  };
  useEffect(() => { void load(); }, []);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await work(); await load(); return true; } catch (e) { setError(message(e)); return false; } finally { setBusy(false); }
  };
  const stop = (id: number) => setEditing((p) => { const n = { ...p }; delete n[id]; return n; });

  return (
    <Card aria-label="מילים מוכרות לפי מקצוע">
      <strong>מילים מוכרות לפי מקצוע</strong>
      <Muted>
        נשלחות ל-AI במשתנה {'{{trade_terms}}'} (פריטי עבודה ושאלת הצ'אט), יחד עם המילון של המשתמש, כדי שיבין מילה שנכתבה עם שגיאה.
        המשתנה נכנס לפרומפט רק במקום שבו כותב הפרומפט שם אותו.
      </Muted>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {draft ? (
        <>
          <Form value={draft} onChange={setDraft} />
          <Row>
            <Btn $secondary type="button" onClick={() => setDraft(null)}><X size={16} /> ביטול</Btn>
            <Btn type="button" disabled={busy} onClick={async () => { if (await run(() => tradeTermsApi.create(draft))) setDraft(null); }}><Save size={16} /> שמירה</Btn>
          </Row>
        </>
      ) : (
        <Row style={{ justifyContent: 'flex-start' }}><Btn type="button" onClick={() => setDraft(EMPTY)}><Plus size={16} /> רשימה חדשה</Btn></Row>
      )}
      {list.map((t) => {
        const edit = editing[t.id];
        return (
          <div key={t.id} aria-label={`מילים: ${t.trade}`} style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
            {edit ? (
              <>
                <Form value={edit} onChange={(v) => setEditing((p) => ({ ...p, [t.id]: v }))} />
                <Row>
                  <Btn $secondary type="button" onClick={() => stop(t.id)}><X size={16} /> ביטול</Btn>
                  <Btn type="button" disabled={busy} onClick={async () => { if (await run(() => tradeTermsApi.update(t.id, edit))) stop(t.id); }}><Save size={16} /> שמירה</Btn>
                </Row>
              </>
            ) : (
              <>
                <strong>{t.trade === '*' ? 'כל המקצועות' : t.trade}</strong>{t.isActive ? '' : ' · כבויה'}
                <Muted>{t.terms}</Muted>
                <Row>
                  <Btn $secondary type="button" onClick={() => setEditing((p) => ({ ...p, [t.id]: { trade: t.trade, terms: t.terms, isActive: t.isActive } }))}>עריכה</Btn>
                  {t.isActive && <Btn $secondary type="button" disabled={busy} onClick={() => void run(() => tradeTermsApi.deactivate(t.id))}>כיבוי</Btn>}
                </Row>
              </>
            )}
          </div>
        );
      })}
    </Card>
  );
}
