import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import {
  advisorAdminApi, advisorError, type AdminAdvisorCard, type AdvisorQuestion, type AdvisorSource, type ChipRow,
  type PrincipleRow, type ProfessionRuleRow, type ProfileKeyRow,
} from '../api/advisorAdminApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1rem; font-size: 0.875rem; line-height: 1.6;`;
const Tabs = styled.div`display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;`;
const Btn = styled.button<{ $secondary?: boolean; $active?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.8rem;
  background: ${({ $secondary, $active }) => ($active ? '#1d4ed8' : $secondary ? '#f1f5f9' : '#3b82f6')};
  color: ${({ $secondary, $active }) => ($secondary && !$active ? '#334155' : 'white')};
  border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Card = styled.div`background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem 1.25rem; margin-bottom: 0.75rem;`;
const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem 0.75rem;`;
const Label = styled.label`display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #475569;`;
const Input = styled.input`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;`;
const Area = styled.textarea`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; min-height: 4rem; font-family: inherit;`;
const Select = styled.select`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;`;
const Row = styled.div`display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-top: 0.5rem;`;
const Muted = styled.span`color: #64748b; font-size: 0.8rem;`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.875rem;`;
const QBox = styled.div`border: 1px dashed #cbd5e1; border-radius: 10px; padding: 0.75rem; margin-top: 0.6rem;`;

const GOALS: Record<string, string> = { more_jobs: 'עוד עבודות', close_more: 'לסגור יותר', earn_more: 'להרוויח יותר' };
const SOURCES: Record<AdvisorSource, string> = {
  fixed: 'קבועים (fixed)', profession: 'לפי המקצוע (profession)', catalog: 'סוגי העבודה של העסק (catalog)', free: 'טקסט חופשי (free)',
};
const ICONS = ['handshake', 'users', 'gem', 'message', 'shield', 'tag', 'eye', 'book', 'trophy', 'coins'];

type Tab = 'cards' | 'profile' | 'profession' | 'chips' | 'principles';

export default function AdvisorAdmin() {
  const [tab, setTab] = useState<Tab>('cards');
  return (
    <PageWrap>
      <Title>היועץ העסקי</Title>
      <Desc>
        כל מה שהיועץ מציג מגיע מכאן: הכרטיסים, השאלות והכפתורים, שמות השדות בפרופיל, כפתורי המקצוע, ואיפה מופיע הכפתור הכתום.
        שינוי נשמר מיד, ומופיע בפתיחה הבאה של הכרטיס, בלי עדכון של האתר. ההגדרות ad_* נמצאות ב"הגדרות AI", הטקסטים הקבועים ב-ui_texts (advisor.*), והפרומפטים במסך הפרומפטים.
      </Desc>
      <Tabs role="tablist">
        {([['cards', 'כרטיסים ושאלות'], ['profile', 'שדות הפרופיל'], ['profession', 'כפתורי מקצוע'], ['chips', 'הכפתור הכתום'], ['principles', 'עקרונות']] as [Tab, string][])
          .map(([k, l]) => <Btn key={k} role="tab" aria-selected={tab === k} $secondary $active={tab === k} onClick={() => setTab(k)}>{l}</Btn>)}
      </Tabs>
      {tab === 'cards' && <Cards />}
      {tab === 'profile' && <ProfileKeys />}
      {tab === 'profession' && <ProfessionRules />}
      {tab === 'chips' && <Chips />}
      {tab === 'principles' && <Principles />}
    </PageWrap>
  );
}

// ---------------------------------------------------------------- cards

function Cards() {
  const [cards, setCards] = useState<AdminAdvisorCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = async () => {
    try { setCards((await advisorAdminApi.cards()).data); } catch (e) { setError(advisorError(e)); }
  };
  useEffect(() => { void load(); }, []);
  if (!cards) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  return (
    <>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {Object.keys(GOALS).map((goal) => (
        <div key={goal}>
          <h3>{GOALS[goal]}</h3>
          {cards.filter((c) => c.goal === goal).map((c) => (
            <Card key={c.key} aria-label={`כרטיס ${c.number}`}>
              <Row>
                <strong>{c.number} · {c.title}</strong>
                <Muted>{c.key} · {c.icon ?? 'בלי אייקון'} · {c.isActive ? 'דולק' : 'כבוי'} · {c.questions.length} שאלות</Muted>
                <Btn $secondary onClick={() => setOpen(open === c.key ? null : c.key)}>{open === c.key ? 'סגור' : 'עריכה'}</Btn>
              </Row>
              {open === c.key && <CardEditor card={c} onSaved={(next) => setCards(cards.map((x) => (x.key === next.key ? next : x)))} />}
            </Card>
          ))}
        </div>
      ))}
    </>
  );
}

function CardEditor({ card, onSaved }: { card: AdminAdvisorCard; onSaved: (c: AdminAdvisorCard) => void }) {
  const [draft, setDraft] = useState(card);
  const [handoff, setHandoff] = useState(card.handoff ? JSON.stringify(card.handoff) : '');
  const [numbers, setNumbers] = useState(card.numbersSpec ? JSON.stringify(card.numbersSpec) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(card); }, [card]);

  const act = async (work: () => Promise<{ data: AdminAdvisorCard }>) => {
    setBusy(true); setError(null);
    try { onSaved((await work()).data); } catch (e) { setError(advisorError(e)); } finally { setBusy(false); }
  };
  const json = (s: string) => {
    if (!s.trim()) return null;
    try { return JSON.parse(s); } catch { throw new Error('JSON לא תקין'); }
  };
  const saveCard = () => act(async () => {
    let h, n;
    try { h = json(handoff); n = json(numbers); } catch (e) { setError((e as Error).message); throw e; }
    return advisorAdminApi.updateCard(card.key, {
      title: draft.title, subtitle: draft.subtitle, icon: draft.icon ?? '', goal: draft.goal, sortOrder: draft.sortOrder,
      opening: draft.opening, isActive: draft.isActive, handoff: h, numbersSpec: n,
    });
  });
  const move = (i: number, d: number) => {
    const keys = card.questions.map((q) => q.key);
    [keys[i], keys[i + d]] = [keys[i + d], keys[i]];
    void act(() => advisorAdminApi.reorder(card.key, keys));
  };

  return (
    <div>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <Grid>
        <Label>כותרת<Input aria-label="כותרת" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Label>
        <Label>שורה קטנה<Input aria-label="שורה קטנה" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></Label>
        <Label>אייקון
          <Select aria-label="אייקון" value={draft.icon ?? ''} onChange={(e) => setDraft({ ...draft, icon: e.target.value || null })}>
            <option value="">בלי</option>{ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </Label>
        <Label>מטרה
          <Select aria-label="מטרה" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value as AdminAdvisorCard['goal'] })}>
            {Object.entries(GOALS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Label>
        <Label>סדר<Input aria-label="סדר" type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></Label>
        <Label>דולק<input aria-label="דולק" type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /></Label>
      </Grid>
      <Label>פתיחה<Area aria-label="פתיחה" value={draft.opening} onChange={(e) => setDraft({ ...draft, opening: e.target.value })} /></Label>
      <Grid>
        <Label>הכפתור לסוכן הלקוח (JSON, ריק = בלי)<Input aria-label="כפתור לסוכן הלקוח" dir="ltr" value={handoff} onChange={(e) => setHandoff(e.target.value)} /></Label>
        <Label>כרטיס המספרים (JSON: kind, metric, title…; ריק = בלי)<Input aria-label="כרטיס המספרים" dir="ltr" value={numbers} onChange={(e) => setNumbers(e.target.value)} /></Label>
      </Grid>
      <Row><Btn disabled={busy} onClick={() => void saveCard().catch(() => undefined)}><Save size={14} />שמור כרטיס</Btn></Row>

      <h4>שאלות</h4>
      {card.questions.map((q, i) => (
        <QuestionEditor key={q.key} q={q} busy={busy}
          onSave={(next) => act(() => advisorAdminApi.updateQuestion(card.key, next))}
          onDelete={() => act(() => advisorAdminApi.deleteQuestion(card.key, q.key))}
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < card.questions.length - 1 ? () => move(i, 1) : undefined} />
      ))}
      <Row>
        <Btn $secondary disabled={busy} onClick={() => void act(() => advisorAdminApi.addQuestion(card.key, { text: 'שאלה חדשה', source: 'fixed', options: [{ key: '', label: 'כן' }, { key: '', label: 'לא' }] }))}>
          <Plus size={14} />הוסף שאלה
        </Btn>
      </Row>
    </div>
  );
}

function QuestionEditor({ q, busy, onSave, onDelete, onUp, onDown }: {
  q: AdvisorQuestion; busy: boolean; onSave: (q: AdvisorQuestion) => void; onDelete: () => void; onUp?: () => void; onDown?: () => void;
}) {
  const [d, setD] = useState(q);
  const [options, setOptions] = useState(q.options.map((o) => o.label).join('\n'));
  useEffect(() => { setD(q); setOptions(q.options.map((o) => o.label).join('\n')); }, [q]);
  const save = () => {
    // Keep each button's key by its place, so answers saved under it stay theirs.
    const labels = options.split('\n').map((s) => s.trim()).filter(Boolean);
    onSave({ ...d, options: labels.map((label, i) => ({ key: q.options[i]?.key ?? '', label })) });
  };
  return (
    <QBox aria-label={`שאלה ${q.key}`}>
      <Row><strong>{q.key}</strong><Muted>{q.profileKey ?? 'לא נשמר בפרופיל'}</Muted></Row>
      <Label>טקסט השאלה<Input aria-label={`טקסט ${q.key}`} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} /></Label>
      <Grid>
        <Label>מקור הכפתורים
          <Select aria-label={`מקור ${q.key}`} value={d.source} onChange={(e) => setD({ ...d, source: e.target.value as AdvisorSource })}>
            {Object.entries(SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Label>
        <Label>שדה בפרופיל<Input aria-label={`שדה ${q.key}`} dir="ltr" value={d.profileKey ?? ''} onChange={(e) => setD({ ...d, profileKey: e.target.value || null })} /></Label>
        <Label>כפתור "אין" (בטקסט חופשי)<Input aria-label={`אין ${q.key}`} value={d.noneLabel ?? ''} onChange={(e) => setD({ ...d, noneLabel: e.target.value || null })} /></Label>
        {d.source === 'catalog' && (
          <Label>סדר סוגי העבודה
            <Select aria-label={`סדר ${q.key}`} value={d.catalogOrder ?? 'most'} onChange={(e) => setD({ ...d, catalogOrder: e.target.value as 'most' | 'least' })}>
              <option value="most">הנשלח ביותר ראשון</option><option value="least">הנשלח הכי מעט ראשון</option>
            </Select>
          </Label>
        )}
      </Grid>
      <Label>
        {d.source === 'fixed' ? 'הכפתורים (שורה לכל כפתור)' : d.source === 'free' ? 'כפתורים (לא בשימוש בטקסט חופשי)' : 'כפתורי ברירת מחדל ("כל מקצוע" / דוגמה)'}
        <Area aria-label={`כפתורים ${q.key}`} value={options} onChange={(e) => setOptions(e.target.value)} />
      </Label>
      <Row>
        <Btn disabled={busy} onClick={save}><Save size={14} />שמור שאלה</Btn>
        <Btn $secondary disabled={busy || !onUp} onClick={onUp} aria-label={`למעלה ${q.key}`}><ArrowUp size={14} /></Btn>
        <Btn $secondary disabled={busy || !onDown} onClick={onDown} aria-label={`למטה ${q.key}`}><ArrowDown size={14} /></Btn>
        <Btn $secondary disabled={busy} onClick={() => { if (window.confirm('למחוק את השאלה?')) onDelete(); }} aria-label={`מחק ${q.key}`}><Trash2 size={14} /></Btn>
      </Row>
    </QBox>
  );
}

// ---------------------------------------------------------------- the other tables

function useRows<T>(load: () => Promise<{ data: T[] }>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => { try { setRows((await load()).data); } catch (e) { setError(advisorError(e)); } };
  useEffect(() => { void reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, setRows, error, setError, reload };
}

function ProfileKeys() {
  const { rows, setRows, error, setError } = useRows(advisorAdminApi.profileKeys);
  if (!rows) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  const save = async (r: ProfileKeyRow) => {
    setError(null);
    try { const { data } = await advisorAdminApi.saveProfileKey(r); setRows(rows.map((x) => (x.key === data.key ? data : x))); } catch (e) { setError(advisorError(e)); }
  };
  return (
    <>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {rows.map((r) => <ProfileKeyEditor key={r.key} row={r} onSave={save} />)}
    </>
  );
}

function ProfileKeyEditor({ row, onSave }: { row: ProfileKeyRow; onSave: (r: ProfileKeyRow) => void }) {
  const [d, setD] = useState(row);
  return (
    <Card aria-label={`שדה ${row.key}`}>
      <Row><strong dir="ltr">{row.key}</strong><Muted>{row.goal ? GOALS[row.goal] : 'מהשיחה'}</Muted></Row>
      <Grid>
        <Label>שם (זכר)<Input value={d.labelM} onChange={(e) => setD({ ...d, labelM: e.target.value })} /></Label>
        <Label>שם (נקבה)<Input value={d.labelF} onChange={(e) => setD({ ...d, labelF: e.target.value })} /></Label>
        <Label>סוג
          <Select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as ProfileKeyRow['type'] })}>
            <option value="choice">בחירה</option><option value="multi">כמה בחירות</option><option value="text">טקסט</option><option value="yes_no">כן/לא</option>
          </Select>
        </Label>
        <Label>מטרה
          <Select value={d.goal ?? ''} onChange={(e) => setD({ ...d, goal: (e.target.value || null) as ProfileKeyRow['goal'] })}>
            <option value="">בלי</option>{Object.entries(GOALS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Label>
      </Grid>
      <Row><Btn onClick={() => onSave(d)}><Save size={14} />שמור</Btn></Row>
    </Card>
  );
}

function ProfessionRules() {
  const { rows, error, setError, reload } = useRows(advisorAdminApi.professionRules);
  if (!rows) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  const empty: ProfessionRuleRow = {
    id: 0, profession: '', matchWords: '[]', reassures: '', clientFear: '[]', urgentMoments: '[]', neighborTrades: '[]', outcome: '[]', whenToCall: '[]', options: '{}', isActive: true, updatedAt: '',
  };
  const save = async (r: ProfessionRuleRow) => {
    setError(null);
    try { await advisorAdminApi.saveProfessionRule(r); await reload(); } catch (e) { setError(advisorError(e)); }
  };
  return (
    <>
      <Desc>כפתורי השאלות שמקורן "לפי המקצוע". options = שדה בפרופיל → רשימת כפתורים. שדה שאין לו כאן כפתורים מקבל את כפתורי ברירת המחדל של השאלה ("כל מקצוע").</Desc>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {[...rows, empty].map((r) => <JsonRowEditor key={r.id || 'new'} title={r.profession || 'מקצוע חדש'} row={r} onSave={save}
        fields={['profession', 'matchWords', 'reassures', 'clientFear', 'urgentMoments', 'neighborTrades', 'outcome', 'whenToCall', 'options']} />)}
    </>
  );
}

function Chips() {
  const { rows, setRows, error, setError } = useRows(advisorAdminApi.chipMap);
  if (!rows) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  const save = async (r: ChipRow) => {
    setError(null);
    try { const { data } = await advisorAdminApi.saveChip(r); setRows(rows.map((x) => (x.questionKey === data.questionKey ? data : x))); } catch (e) { setError(advisorError(e)); }
  };
  return (
    <>
      <Desc>"מה עושים עם זה?" מתחת לתשובה. {rows.filter((r) => r.isOn).length} דולקים, {rows.filter((r) => !r.isOn).length} כבויים.</Desc>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {rows.map((r) => <JsonRowEditor key={r.questionKey} title={r.questionKey} row={r} onSave={save} toggle="isOn"
        fields={['buttonType', 'buttonTarget', 'kbKeys', 'minRule', 'questionHint']} />)}
    </>
  );
}

function Principles() {
  const { rows, error, setError, reload } = useRows(advisorAdminApi.principles);
  if (!rows) return error ? <ErrorText role="alert">{error}</ErrorText> : null;
  const empty: PrincipleRow = { id: 0, kbKey: 'kb_', title: '', essence: '', backgroundOnlyNotes: '', dataAnchors: '[]', goals: '[]', isActive: true, version: 0, updatedAt: '' };
  const save = async (r: PrincipleRow) => {
    setError(null);
    try { await advisorAdminApi.savePrinciple(r); await reload(); } catch (e) { setError(advisorError(e)); }
  };
  return (
    <>
      {rows.length === 0 && <Desc>עוד אין עקרונות. התוכן שלהם (kb_referrals, kb_quote_is_the_sale…) מחכה ליהושע.</Desc>}
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {[...rows, empty].map((r) => <JsonRowEditor key={r.id || 'new'} title={r.id ? r.kbKey : 'עיקרון חדש'} row={r} onSave={save}
        fields={['kbKey', 'title', 'essence', 'backgroundOnlyNotes', 'dataAnchors', 'goals']} />)}
    </>
  );
}

/** A plain editor for a row of text and JSON-text fields. */
function JsonRowEditor<T extends object>({ title, row, fields, onSave, toggle }: {
  title: string; row: T; fields: (keyof T & string)[]; onSave: (r: T) => void; toggle?: keyof T & string;
}) {
  const [d, setD] = useState<T>(row);
  useEffect(() => { setD(row); }, [row]);
  const get = (k: keyof T & string) => (d[k] ?? '') as unknown as string;
  return (
    <Card aria-label={title}>
      <Row>
        <strong dir="auto">{title}</strong>
        {toggle && <Label>דולק<input type="checkbox" aria-label={`דולק ${title}`} checked={Boolean(d[toggle])} onChange={(e) => setD({ ...d, [toggle]: e.target.checked })} /></Label>}
      </Row>
      <Grid>
        {fields.map((f) => (
          <Label key={f}>{f}<Input dir="auto" aria-label={`${f} ${title}`} value={get(f)} onChange={(e) => setD({ ...d, [f]: e.target.value || (f === 'buttonTarget' || f === 'minRule' || f === 'questionHint' ? null : '') })} /></Label>
        ))}
      </Grid>
      <Row><Btn onClick={() => onSave(d)}><Save size={14} />שמור</Btn></Row>
    </Card>
  );
}
