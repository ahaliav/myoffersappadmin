import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminApi, normalizeOfferEngagement } from '../api/adminApi';
import type { AdminOfferEngagementDto } from '../api/adminApi';
import { RefreshCw, Link2 } from 'lucide-react';

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Subtitle = styled.p`
  margin: -0.75rem 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #64748b;
  line-height: 1.5;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Search = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 220px;
  max-width: 100%;
`;

const TableWrap = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: auto;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 960px;
`;

const Th = styled.th`
  text-align: right;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: top;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $status }) => {
    const s = $status.toUpperCase();
    if (s === 'APPROVED') return '#bbf7d0';
    if (s === 'REJECTED') return '#fecaca';
    if (s === 'PENDING' || s === 'OPEN') return '#dbeafe';
    if (s === 'EXPIRED') return '#e2e8f0';
    return '#f1f5f9';
  }};
  color: #0f172a;
`;

const Num = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
`;

const Ltr = styled.span`
  direction: ltr;
  display: inline-block;
  unicode-bidi: embed;
`;

const Empty = styled.p`
  color: #64748b;
  margin: 2rem 0 0 0;
`;

function formatDt(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function OffersEngagement() {
  const [raw, setRaw] = useState<AdminOfferEngagementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const rows = useMemo(() => raw.map(normalizeOfferEngagement), [raw]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        String(r.offerId).includes(t) ||
        r.title.toLowerCase().includes(t) ||
        r.status.toLowerCase().includes(t) ||
        r.userEmail.toLowerCase().includes(t) ||
        (r.customerEmail && r.customerEmail.toLowerCase().includes(t)) ||
        (r.customerFullName && r.customerFullName.toLowerCase().includes(t))
    );
  }, [rows, q]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOffersEngagement();
      setRaw(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Title>הצעות — צפיות וחתימה</Title>
      <Subtitle>
        פתיחות הקישור החיצוני נספרות בכל טעינת דף של הלקוח; סטטוס ההצעה מהמערכת; חתימה מוצגת כאשר נרשמה חתימה על הצעה דרך קישור השיתוף.
      </Subtitle>
      <Toolbar>
        <Btn type="button" onClick={load} disabled={loading}>
          <RefreshCw size={18} />
          רענן
        </Btn>
        <Search
          type="search"
          placeholder="חיפוש לפי מזהה, כותרת, סטטוס, אימייל..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="חיפוש"
        />
      </Toolbar>
      {error && <Empty>{error}</Empty>}
      {!error && loading && raw.length === 0 && <Empty>טוען…</Empty>}
      {!error && !loading && raw.length === 0 && <Empty>אין הצעות להצגה.</Empty>}
      {(raw.length > 0 || (!loading && filtered.length > 0)) && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>כותרת</Th>
                <Th>בעלים</Th>
                <Th>לקוח</Th>
                <Th>סטטוס</Th>
                <Th>
                  <Link2 size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                  פתיחות קישור
                </Th>
                <Th>צפייה אחרונה</Th>
                <Th>נחתם?</Th>
                <Th>מועד חתימה</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.offerId}>
                  <Td>
                    <Num>{r.offerId}</Num>
                  </Td>
                  <Td>{r.title || '—'}</Td>
                  <Td>
                    <div>{r.userFullName}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      <Ltr>{r.userEmail}</Ltr>
                    </div>
                  </Td>
                  <Td>
                    {r.customerFullName || r.customerEmail ? (
                      <>
                        {r.customerFullName && <div>{r.customerFullName}</div>}
                        {r.customerEmail && (
                          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            <Ltr>{r.customerEmail}</Ltr>
                          </div>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <StatusBadge $status={r.status}>{r.status}</StatusBadge>
                  </Td>
                  <Td>
                    <Num>{r.externalLinkOpenCount}</Num>
                  </Td>
                  <Td>{formatDt(r.lastExternalLinkViewAt)}</Td>
                  <Td>{r.isSigned ? 'כן' : 'לא'}</Td>
                  <Td>{formatDt(r.signedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
      {!loading && raw.length > 0 && filtered.length === 0 && (
        <Empty>אין תוצאות לחיפוש.</Empty>
      )}
    </div>
  );
}
