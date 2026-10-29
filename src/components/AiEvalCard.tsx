import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Play } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { apiErrorMessage } from '../api/aiSettingsApi';

/**
 * AI evaluation harness (backend: /api/admin/ai-eval). Runs synthetic cases through the real model and the
 * published prompts and checks hard rules. Each run costs money (charged to the admin) — use on staging.
 */
interface EvalCase { id: string; description: string; feature: string }
interface EvalResult { id: string; description: string; passed: boolean; status: string; failures: string[]; latencyMs: number; provider: string | null; model: string | null }
interface EvalReport { ranAt: string; total: number; passed: number; results: EvalResult[] }

export default function AiEvalCard() {
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [report, setReport] = useState<EvalReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosClient.get<EvalCase[]>('/api/admin/ai-eval/cases').then((r) => setCases(r.data)).catch(() => setCases([]));
  }, []);

  const run = async () => {
    if (!window.confirm(`להריץ ${cases.length} בדיקות מול המודל האמיתי? כל הרצה עולה כסף.`)) return;
    setRunning(true);
    setError(null);
    try {
      const { data } = await axiosClient.post<EvalReport>('/api/admin/ai-eval/run', {});
      setReport(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'ההרצה נכשלה'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card aria-label="בדיקות איכות">
      <Head>
        <h2>בדיקות איכות ({cases.length})</h2>
        <RunBtn type="button" onClick={() => void run()} disabled={running || cases.length === 0}>
          <Play size={14} /> {running ? 'מריץ…' : 'הרץ את כל הבדיקות'}
        </RunBtn>
      </Head>
      <Muted>מקרים סינתטיים בלבד, דרך הפרומפטים שפורסמו והמודל שמוגדר. בודק כללים קשיחים: מבנה, בלי מספרים או מחירים מומצאים, שמירת המותג של המשתמש, עמידות להזרקה.</Muted>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {report && (
        <>
          <Summary $ok={report.passed === report.total}>עברו {report.passed} מתוך {report.total}</Summary>
          <Table>
            <thead><tr><th>מקרה</th><th>תוצאה</th><th>זמן</th><th>מודל</th><th>מה נכשל</th></tr></thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.id}>
                  <td title={r.description} dir="ltr">{r.id}</td>
                  <td>{r.passed ? '✅' : '❌'} <small>{r.status}</small></td>
                  <td>{r.latencyMs} ms</td>
                  <td dir="ltr">{r.provider && r.model ? `${r.provider}/${r.model}` : '—'}</td>
                  <td>{r.failures.join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </Card>
  );
}

interface RouterResult { id: string; text: string; passed: boolean; failures: string[]; got: string; latencyMs: number }
interface RouterReport { ranAt: string; total: number; passed: number; percent: number; results: RouterResult[] }

/**
 * Today smart's router test set (backend: /api/admin/ai-eval/router-*): each sentence through the real router and code's
 * checks, against the intent and key it must get. Target ≥ 95%. Real model calls — use on staging, with Today smart on.
 */
export function RouterEvalCard() {
  const [count, setCount] = useState(0);
  const [report, setReport] = useState<RouterReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosClient.get<unknown[]>('/api/admin/ai-eval/router-cases').then((r) => setCount(r.data.length)).catch(() => setCount(0));
  }, []);

  const run = async () => {
    if (!window.confirm(`להריץ ${count} משפטים מול הנתב האמיתי? כל הרצה עולה כסף.`)) return;
    setRunning(true);
    setError(null);
    try {
      const { data } = await axiosClient.post<RouterReport>('/api/admin/ai-eval/router-run', {});
      setReport(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'ההרצה נכשלה (Today smart צריך להיות פעיל)'));
    } finally {
      setRunning(false);
    }
  };

  const failed = report?.results.filter((r) => !r.passed) ?? [];
  return (
    <Card aria-label="נתב Today smart">
      <Head>
        <h2>נתב Today smart ({count} משפטים)</h2>
        <RunBtn type="button" onClick={() => void run()} disabled={running || count === 0}>
          <Play size={14} /> {running ? 'מריץ…' : 'הרץ'}
        </RunBtn>
      </Head>
      <Muted>כל משפט עובר בנתב ובבדיקות של הקוד, ונבדק מול הכוונה והמפתח שהוא צריך לקבל. היעד: 95% ומעלה.</Muted>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {report && (
        <>
          <Summary $ok={report.percent >= 95}>עברו {report.passed} מתוך {report.total} ({report.percent}%)</Summary>
          {failed.length > 0 && (
            <Table>
              <thead><tr><th>מקרה</th><th>משפט</th><th>מה יצא</th><th>מה נכשל</th></tr></thead>
              <tbody>
                {failed.map((r) => (
                  <tr key={r.id}>
                    <td dir="ltr">{r.id}</td>
                    <td>{r.text}</td>
                    <td dir="ltr">{r.got}</td>
                    <td>{r.failures.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </Card>
  );
}

const Card = styled.section`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.15rem;
  margin-bottom: 1rem;
  h2 { margin: 0; font-size: 1.05rem; }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
`;

const RunBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const Muted = styled.p`
  margin: 0 0 0.6rem;
  color: #64748b;
  font-size: 0.85rem;
`;

const Summary = styled.div<{ $ok: boolean }>`
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: ${({ $ok }) => ($ok ? '#166534' : '#b91c1c')};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  th, td { padding: 0.35rem 0.45rem; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: top; }
  th { color: #64748b; font-weight: 500; }
`;

const ErrorText = styled.p`
  color: #b91c1c;
  font-size: 0.85rem;
`;
