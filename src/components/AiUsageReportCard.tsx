import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { apiErrorMessage } from '../api/aiSettingsApi';

/** System-wide AI report (backend: /api/admin/ai-usage-report). No prompt or customer content. */
interface FeatureRow {
  operation: string;
  promptKey: string | null;
  calls: number;
  failed: number;
  p50Ms: number | null;
  p95Ms: number | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | null;
  errors: Record<string, number>;
}

interface FailureRow {
  at: string;
  userId: number;
  operation: string;
  promptKey: string | null;
  errorKind: string | null;
  provider: string | null;
  model: string | null;
  correlationId: string | null;
}

interface Report {
  days: number;
  calls: number;
  failed: number;
  estimatedCost: number | null;
  features: FeatureRow[];
  recentFailures: FailureRow[];
}

const usd = (n: number | null) => (n == null ? '—' : `$${n.toFixed(n < 1 ? 4 : 2)}`);
const pct = (part: number, all: number) => (all === 0 ? '0%' : `${Math.round((part / all) * 1000) / 10}%`);

export default function AiUsageReportCard() {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosClient.get<Report>('/api/admin/ai-usage-report', { params: { days } });
      setReport(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'טעינת הדוח נכשלה'));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card aria-label="דוח AI">
      <Head>
        <h2>דוח AI מערכתי</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="טווח ימים">
          {[1, 7, 30, 90].map((d) => <option key={d} value={d}>{d === 1 ? 'יום אחרון' : `${d} ימים`}</option>)}
        </select>
        <IconBtn type="button" onClick={() => void load()} disabled={loading} aria-label="רענון"><RefreshCw size={16} /></IconBtn>
      </Head>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {report && (
        <>
          <Stats>
            <span>קריאות: <b>{report.calls.toLocaleString()}</b></span>
            <span>נכשלו: <b>{report.failed.toLocaleString()}</b> ({pct(report.failed, report.calls)})</span>
            <span>עלות משוערת: <b>{usd(report.estimatedCost)}</b></span>
          </Stats>
          {report.features.length === 0 ? <Muted>אין קריאות AI בטווח הזה.</Muted> : (
            <Table>
              <thead>
                <tr><th>פיצ׳ר</th><th>קריאות</th><th>כשלונות</th><th>p50</th><th>p95</th><th>טוקנים (נכנס / יוצא)</th><th>עלות</th><th>סוגי שגיאה</th></tr>
              </thead>
              <tbody>
                {report.features.map((f) => (
                  <tr key={`${f.operation}|${f.promptKey ?? ''}`}>
                    <td dir="ltr">{f.promptKey ?? f.operation}</td>
                    <td>{f.calls}</td>
                    <td>{f.failed} ({pct(f.failed, f.calls)})</td>
                    <td>{f.p50Ms == null ? '—' : `${f.p50Ms} ms`}</td>
                    <td>{f.p95Ms == null ? '—' : `${f.p95Ms} ms`}</td>
                    <td>{f.inputTokens.toLocaleString()} / {f.outputTokens.toLocaleString()}</td>
                    <td>{usd(f.estimatedCost)}</td>
                    <td dir="ltr">{Object.entries(f.errors).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {report.recentFailures.length > 0 && (
            <>
              <h3>כשלונות אחרונים</h3>
              <Table>
                <thead><tr><th>זמן</th><th>משתמש</th><th>פיצ׳ר</th><th>שגיאה</th><th>מודל</th><th>מזהה בקשה</th></tr></thead>
                <tbody>
                  {report.recentFailures.map((f, i) => (
                    <tr key={`${f.correlationId ?? i}-${f.at}`}>
                      <td>{new Date(f.at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{f.userId}</td>
                      <td dir="ltr">{f.promptKey ?? f.operation}</td>
                      <td dir="ltr">{f.errorKind ?? '—'}</td>
                      <td dir="ltr">{f.provider && f.model ? `${f.provider}/${f.model}` : '—'}</td>
                      <td dir="ltr"><code>{f.correlationId ?? '—'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
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
  h2 { margin: 0; font-size: 1.1rem; }
  h3 { font-size: 0.95rem; margin: 1rem 0 0.4rem; }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
  select { margin-inline-start: auto; padding: 0.3rem 0.4rem; border-radius: 6px; border: 1px solid #cbd5e1; }
`;

const IconBtn = styled.button`
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.3rem 0.45rem;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
`;

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.25rem;
  font-size: 0.9rem;
  margin-bottom: 0.6rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  th, td { padding: 0.35rem 0.45rem; border-bottom: 1px solid #f1f5f9; text-align: right; }
  th { color: #64748b; font-weight: 500; }
`;

const Muted = styled.p`
  color: #64748b;
  font-size: 0.85rem;
  margin: 0;
`;

const ErrorText = styled.p`
  color: #b91c1c;
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
`;
