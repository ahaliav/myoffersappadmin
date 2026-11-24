import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { aiGuardsApi, type AiGuard } from '../api/aiGuardsApi';
import { apiErrorMessage } from '../api/aiSettingsApi';

// AI-11 "מסך שומרים": the checks that run after every AI answer, in all areas — a switch and a threshold each, and how
// often each one acted (the lines it wrote in "מה קרה בקריאה"). Default = today's behaviour; off only from here.

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.25rem; font-size: 0.875rem; line-height: 1.6;`;
const Area = styled.h2`margin: 1.25rem 0 0.5rem; font-size: 1.05rem; color: #0f172a;`;
const Card = styled.div<{ $off: boolean }>`background: ${({ $off }) => ($off ? '#f8fafc' : '#fff')}; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 0.85rem 1rem; margin-bottom: 0.6rem; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5rem 1rem; align-items: start;`;
const Name = styled.div`font-weight: 700; color: #0f172a; font-size: 0.95rem;`;
const Does = styled.p`margin: 0.2rem 0 0; color: #475569; font-size: 0.82rem; line-height: 1.5;`;
const Meta = styled.div`margin-top: 0.35rem; color: #64748b; font-size: 0.75rem; display: flex; gap: 0.75rem; flex-wrap: wrap;`;
const Controls = styled.div`display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end;`;
const Toggle = styled.label`display: inline-flex; gap: 0.4rem; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;`;
const Input = styled.input`width: 4.5rem; padding: 0.3rem 0.45rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem;`;
const Btn = styled.button`display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.8rem;
  font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; color: #334155; &:disabled { opacity: 0.5; cursor: default; }`;
const Badge = styled.span<{ $tone: 'ok' | 'off' | 'lock' }>`display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.72rem;
  font-weight: 600; background: ${({ $tone }) => ($tone === 'ok' ? '#dcfce7' : $tone === 'off' ? '#fee2e2' : '#e2e8f0')};
  color: ${({ $tone }) => ($tone === 'ok' ? '#166534' : $tone === 'off' ? '#991b1b' : '#334155')};`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.85rem; margin: 0;`;
const Code = styled.code`direction: ltr; font-size: 0.72rem; color: #64748b;`;

function GuardCard({ guard, onSaved }: { guard: AiGuard; onSaved: (g: AiGuard) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(guard.threshold ? String(guard.threshold.value) : '');

  const save = async (body: { on?: boolean; threshold?: number }) => {
    setBusy(true);
    setError(null);
    try { onSaved((await aiGuardsApi.set(guard.key, body)).data); } catch (e) { setError(apiErrorMessage(e, 'השמירה נכשלה')); } finally { setBusy(false); }
  };

  const toggle = (on: boolean) => {
    if (!on && !window.confirm(`לכבות את "${guard.label}"? תשובות ה-AI יוצגו בלי הבדיקה הזו.`)) return;
    void save({ on });
  };

  return (
    <Card $off={!guard.on} aria-label={guard.label}>
      <div>
        <Name>{guard.label} {guard.locked ? <Badge $tone="lock">נעול</Badge> : <Badge $tone={guard.on ? 'ok' : 'off'}>{guard.on ? 'פעיל' : 'כבוי'}</Badge>}</Name>
        <Does>{guard.does}</Does>
        <Meta>
          <span>פעל {guard.firedLast7Days} פעמים ב-7 הימים האחרונים{guard.lastFiredAt ? ` · אחרון ${new Date(guard.lastFiredAt).toLocaleString('he-IL')}` : ''}</span>
          <Link to={`/ai-traces?kind=guard&promptKey=${encodeURIComponent(guard.key)}`}>לרישומים</Link>
          <Code>{guard.key}</Code>
        </Meta>
        {error && <ErrorText role="alert">{error}</ErrorText>}
      </div>
      <Controls>
        {guard.locked ? <span style={{ fontSize: '0.8rem', color: '#64748b' }}>נרשם בלבד</span> : (
          <Toggle>
            <input type="checkbox" checked={guard.on} disabled={busy} onChange={(e) => toggle(e.target.checked)} aria-label={`${guard.label}: פעיל`} />
            {guard.on ? 'פעיל' : 'כבוי'}
          </Toggle>
        )}
        {guard.threshold && (
          <form onSubmit={(e) => { e.preventDefault(); const n = Number(threshold); if (Number.isInteger(n)) void save({ threshold: n }); }}
            style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', fontSize: '0.78rem', color: '#475569' }}>
            <span>{guard.threshold.label}</span>
            <Input type="number" min={guard.threshold.min} max={guard.threshold.max} value={threshold} onChange={(e) => setThreshold(e.target.value)}
              aria-label={`${guard.label}: רף`} />
            <Btn type="submit" disabled={busy || threshold === String(guard.threshold.value)}>שמור</Btn>
          </form>
        )}
      </Controls>
    </Card>
  );
}

export default function AiGuards() {
  const [guards, setGuards] = useState<AiGuard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    aiGuardsApi.list().then(({ data }) => setGuards(data)).catch((e) => setError(apiErrorMessage(e, 'הטעינה נכשלה')));
  }, []);
  useEffect(load, [load]);

  const areas = guards ? [...new Set(guards.map((g) => g.area))] : [];
  return (
    <PageWrap>
      <Title>שומרים</Title>
      <Desc>
        הבדיקות שרצות אחרי כל תשובת AI, ומורידות, מקצרות או מחליפות אותה. כל פעם ששומר פועל זה נרשם ב"מה קרה בקריאה" (כשהרישום פעיל שם).
        ברירת המחדל של כל שומר היא ההתנהגות של היום; כיבוי רק מכאן.
        {' '}<Btn type="button" onClick={load}><RefreshCw size={14} /> רענן</Btn>
      </Desc>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {!guards && !error && <Desc>טוען…</Desc>}
      {areas.map((area) => (
        <section key={area}>
          <Area>{area}</Area>
          {guards!.filter((g) => g.area === area).map((g) => (
            <GuardCard key={g.key} guard={g} onSaved={(saved) => setGuards((prev) => prev!.map((x) => (x.key === saved.key ? saved : x)))} />
          ))}
        </section>
      ))}
    </PageWrap>
  );
}
