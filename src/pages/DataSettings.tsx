import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { RotateCcw, Save } from 'lucide-react';
import { dataSettingsApi, type DataQuestionRow, type DataSettings as Data, type ForecastAccuracyMonth, type QuestionEdit } from '../api/dataSettingsApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.25rem; font-size: 0.875rem; line-height: 1.6;`;
const Tabs = styled.div`display: flex; gap: 0.4rem; margin-bottom: 1rem; flex-wrap: wrap;`;
const Tab = styled.button<{ $on: boolean }>`
  padding: 0.45rem 0.9rem; border-radius: 8px; border: 1px solid ${({ $on }) => ($on ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $on }) => ($on ? '#eff6ff' : '#fff')}; color: ${({ $on }) => ($on ? '#1d4ed8' : '#334155')}; cursor: pointer; font-size: 0.875rem;
`;
const Card = styled.div`background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; margin-bottom: 0.5rem;`;
const Row = styled.div`display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;`;
const Key = styled.code`font-size: 0.8rem; color: #0f172a; min-width: 220px;`;
const Muted = styled.span`color: #64748b; font-size: 0.8rem;`;
const Input = styled.input`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; min-width: 120px;`;
const Area = styled.textarea`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; width: 100%; font-family: inherit;`;
const Label = styled.label`display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem; color: #475569; margin-top: 0.4rem;`;
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; background: #3b82f6; color: #fff; border: none;
  border-radius: 8px; font-size: 0.85rem; cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Ghost = styled(Btn)`background: #fff; color: #334155; border: 1px solid #e2e8f0;`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.875rem;`;
const Section = styled.h3`margin: 1rem 0 0.5rem; font-size: 1rem;`;

type TabKey = 'numbers' | 'questions' | 'rules' | 'history' | 'accuracy';

const SECTIONS: Record<string, string> = {
  revenue: 'הכנסות', ranking: 'דירוג עבודות', close_rate: 'אחוז סגירה', statuses: 'הצעות לפי סטטוסים', areas: 'הצעות לפי אזורים', close_time: 'זמן ממוצע לסגירה',
};

/**
 * F-9 "הגדרות עמוד הנתונים": the data page's numbers, questions and smart-insight rules. Saving applies at once (no deploy)
 * and is kept in the history; a number can go back to an earlier value. The answer and router prompts are in "כתיבה עם AI".
 */
export default function DataSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<TabKey>('numbers');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionEdit>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<ForecastAccuracyMonth[] | null>(null);
  useEffect(() => {
    if (tab !== 'accuracy' || accuracy) return;
    dataSettingsApi.forecastAccuracy().then(setAccuracy).catch(() => setAccuracy([]));
  }, [tab, accuracy]);

  const load = () => dataSettingsApi.get().then(setData).catch(() => setError('לא הצלחתי לטעון'));
  useEffect(() => { void load(); }, []);

  const save = async (id: string, run: () => Promise<unknown>, after?: () => void) => {
    setSaving(id);
    setError(null);
    try {
      await run();
      setDrafts((d) => { const next = { ...d }; delete next[id]; return next; });
      after?.();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'השמירה נכשלה');
    } finally {
      setSaving(null);
    }
  };

  if (!data) return <PageWrap><Title>הגדרות עמוד הנתונים</Title>{error && <ErrorText>{error}</ErrorText>}</PageWrap>;

  const editOf = (q: DataQuestionRow): QuestionEdit => questionDrafts[q.key] ?? {
    title: q.title, subtitle: q.subtitle, instruction: q.instruction, exampleGood: q.exampleGood, exampleBad: q.exampleBad, isActive: q.isActive,
  };
  const setQuestion = (key: string, patch: Partial<QuestionEdit>, base: QuestionEdit) =>
    setQuestionDrafts((d) => ({ ...d, [key]: { ...base, ...patch } }));

  return (
    <PageWrap>
      <Title>הגדרות עמוד הנתונים</Title>
      <Desc>
        המספרים, השאלות והתובנות של עמוד הנתונים. שמירה חלה מיד, בלי פריסה, ונשמרת בהיסטוריה. את הפרומפטים (תשובות, נתב, דפוס שבועי) עורכים ב"כתיבה עם AI".
      </Desc>
      <Tabs>
        <Tab $on={tab === 'numbers'} onClick={() => setTab('numbers')}>מספרים ({data.settings.length})</Tab>
        <Tab $on={tab === 'questions'} onClick={() => setTab('questions')}>שאלות ({data.questions.length})</Tab>
        <Tab $on={tab === 'rules'} onClick={() => setTab('rules')}>תובנות ({data.rules.length})</Tab>
        <Tab $on={tab === 'history'} onClick={() => setTab('history')}>היסטוריה</Tab>
        <Tab $on={tab === 'accuracy'} onClick={() => setTab('accuracy')}>דיוק צפי</Tab>
      </Tabs>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      {tab === 'numbers' && data.settings.map((s) => {
        const id = 's:' + s.key;
        const value = drafts[id] ?? s.value;
        return (
          <Card key={s.key}>
            <Row>
              <Key>{s.key}</Key>
              <Input aria-label={s.key} value={value} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} />
              <Btn type="button" disabled={value === s.value || saving === id} onClick={() => void save(id, () => dataSettingsApi.setSetting(s.key, value))}>
                <Save size={14} /> שמור
              </Btn>
            </Row>
            {s.description && <Muted>{s.description}</Muted>}
          </Card>
        );
      })}

      {tab === 'questions' && Object.keys(SECTIONS).map((section) => (
        <div key={section}>
          <Section>{SECTIONS[section]}</Section>
          {data.questions.filter((q) => q.section === section).map((q) => {
            const edit = editOf(q);
            const id = 'q:' + q.key;
            const dirty = !!questionDrafts[q.key];
            return (
              <Card key={q.key}>
                <Row>
                  <Key>{q.key}</Key>
                  <Muted>{q.periodMode}</Muted>
                  <label><input type="checkbox" checked={edit.isActive} onChange={(e) => setQuestion(q.key, { isActive: e.target.checked }, edit)} /> פעילה</label>
                </Row>
                <Label>שאלה<Input aria-label={`${q.key} title`} value={edit.title} onChange={(e) => setQuestion(q.key, { title: e.target.value }, edit)} /></Label>
                <Label>שורת הסבר<Input aria-label={`${q.key} subtitle`} value={edit.subtitle ?? ''} onChange={(e) => setQuestion(q.key, { subtitle: e.target.value }, edit)} /></Label>
                <Label>הנחיה ל-AI<Area rows={3} value={edit.instruction} onChange={(e) => setQuestion(q.key, { instruction: e.target.value }, edit)} /></Label>
                <Label>דוגמה טובה<Area rows={2} value={edit.exampleGood ?? ''} onChange={(e) => setQuestion(q.key, { exampleGood: e.target.value }, edit)} /></Label>
                <Label>דוגמה רעה<Area rows={2} value={edit.exampleBad ?? ''} onChange={(e) => setQuestion(q.key, { exampleBad: e.target.value }, edit)} /></Label>
                <Row style={{ marginTop: '0.5rem' }}>
                  <Btn type="button" disabled={!dirty || saving === id}
                    onClick={() => void save(id, () => dataSettingsApi.setQuestion(q.key, edit), () => setQuestionDrafts((d) => { const n = { ...d }; delete n[q.key]; return n; }))}>
                    <Save size={14} /> שמור
                  </Btn>
                </Row>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'rules' && Object.keys(SECTIONS).map((section) => (
        <div key={section}>
          <Section>{SECTIONS[section]}</Section>
          {data.rules.filter((r) => r.section === section).map((r) => {
            const id = 'r:' + r.key;
            const template = drafts[id] ?? r.template;
            const priority = Number(drafts[id + ':p'] ?? r.priority);
            const active = (drafts[id + ':a'] ?? String(r.isActive)) === 'true';
            const dirty = template !== r.template || priority !== r.priority || active !== r.isActive;
            return (
              <Card key={r.key}>
                <Row>
                  <Key>{r.key}</Key>
                  <Muted>[תסביר לי] → {r.questionKey ?? '—'}</Muted>
                  <label>עדיפות <Input type="number" min={1} max={99} style={{ minWidth: 60, width: 60 }} aria-label={`${r.key} priority`} value={priority}
                    onChange={(e) => setDrafts((d) => ({ ...d, [id + ':p']: e.target.value }))} /></label>
                  <label><input type="checkbox" checked={active} onChange={(e) => setDrafts((d) => ({ ...d, [id + ':a']: String(e.target.checked) }))} /> פעילה</label>
                </Row>
                <Label>נוסח (הקוד ממלא את ה-{'{{…}}'})<Area rows={2} aria-label={`${r.key} template`} value={template} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} /></Label>
                <Row style={{ marginTop: '0.5rem' }}>
                  <Btn type="button" disabled={!dirty || saving === id}
                    onClick={() => void save(id, () => dataSettingsApi.setRule(r.key, template, priority, active),
                      () => setDrafts((d) => { const n = { ...d }; delete n[id + ':p']; delete n[id + ':a']; return n; }))}>
                    <Save size={14} /> שמור
                  </Btn>
                </Row>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'accuracy' && (
        <>
          <Desc>פעם בחודש: הצפי הראשון של כל עסק ל"תהיה לי עבודה לחודש הבא?" מול העבודה שבאמת התחילה באותו חודש (לפני מע"מ).</Desc>
          {accuracy?.length === 0 && <Muted>עוד אין חודש שנבדק.</Muted>}
          {accuracy?.map((m) => (
            <Card key={m.month}>
              <Row>
                <Key>{m.month.slice(0, 7)}</Key>
                <span>{m.forecasts} צפיים · {m.withRange} עם טווח · {m.inRange} בתוך הטווח</span>
                <Muted>החטאה ממוצעת: {Math.round(m.averageMiss).toLocaleString('he-IL')} ₪</Muted>
              </Row>
            </Card>
          ))}
        </>
      )}

      {tab === 'history' && data.history.map((h) => (
        <Card key={h.key + h.changedAt}>
          <Row>
            <Key>{h.key}</Key><span>{h.value}</span>
            <Muted>{new Date(h.changedAt).toLocaleString('he-IL')} · {h.changedBy ?? '—'}</Muted>
            {h.canRestore && (
              <Ghost type="button" disabled={saving === 'h:' + h.key} onClick={() => void save('h:' + h.key, () => dataSettingsApi.setSetting(h.key, h.value))}>
                <RotateCcw size={14} /> חזור לגרסה
              </Ghost>
            )}
          </Row>
        </Card>
      ))}
    </PageWrap>
  );
}
