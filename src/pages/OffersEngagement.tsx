import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminApi, normalizeOfferEngagement, openAdminOfferPdfInNewTab } from '../api/adminApi';
import type { AdminOfferEngagementDto } from '../api/adminApi';
import { RefreshCw, Link2, FileText, ChevronRight, ChevronLeft, ArrowUp, ArrowDown } from 'lucide-react';

const PAGE_SIZE = 100;

type EngRow = ReturnType<typeof normalizeOfferEngagement>;

type SortKey =
  | 'offerId'
  | 'title'
  | 'user'
  | 'customer'
  | 'status'
  | 'opens'
  | 'lastView'
  | 'isSigned'
  | 'signedAt';

function defaultSortDir(key: SortKey): 'asc' | 'desc' {
  if (
    key === 'offerId' ||
    key === 'opens' ||
    key === 'lastView' ||
    key === 'isSigned' ||
    key === 'signedAt'
  ) {
    return 'desc';
  }
  return 'asc';
}

function userSortString(r: EngRow) {
  return `${r.userFullName} ${r.userEmail}`.trim();
}

function customerSortString(r: EngRow) {
  return `${r.customerFullName ?? ''} ${r.customerEmail ?? ''}`.trim();
}

function timeMs(s: string | null | undefined): number | null {
  if (s == null) return null;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

/** nulls/invalid always sort last (bottom of list) for both directions */
function compareWithNullsLast(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: 'asc' | 'desc'
): number {
  const am = timeMs(a);
  const bm = timeMs(b);
  const aNa = am == null;
  const bNa = bm == null;
  if (aNa && bNa) return 0;
  if (aNa) return 1;
  if (bNa) return -1;
  const c = (am as number) - (bm as number);
  return dir === 'asc' ? c : -c;
}

function sortEngagementRows(rows: EngRow[], key: SortKey, dir: 'asc' | 'desc'): EngRow[] {
  const copy = [...rows];
  const m = (x: number) => (dir === 'asc' ? x : -x);
  copy.sort((a, b) => {
    let c = 0;
    switch (key) {
      case 'offerId':
        c = a.offerId - b.offerId;
        return m(c);
      case 'title':
        c = a.title.localeCompare(b.title, 'he');
        return m(c);
      case 'user':
        c = userSortString(a).localeCompare(userSortString(b), 'he');
        return m(c);
      case 'customer':
        c = customerSortString(a).localeCompare(customerSortString(b), 'he');
        return m(c);
      case 'status':
        c = a.status.localeCompare(b.status, 'he', { sensitivity: 'base' });
        return m(c);
      case 'opens':
        c = a.externalLinkOpenCount - b.externalLinkOpenCount;
        return m(c);
      case 'lastView':
        return compareWithNullsLast(a.lastExternalLinkViewAt, b.lastExternalLinkViewAt, dir);
      case 'isSigned': {
        c = (a.isSigned ? 1 : 0) - (b.isSigned ? 1 : 0);
        return m(c);
      }
      case 'signedAt':
        return compareWithNullsLast(a.signedAt, b.signedAt, dir);
      default:
        return 0;
    }
  });
  return copy;
}

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
  min-width: 1080px;
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

const PdfBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  margin: 0.2rem 0 0.2rem 0.35rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const PdfCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem;
`;

const Pagination = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;
`;

const ThButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  gap: 0.25rem;
  direction: rtl;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 600;
  color: #475569;
  text-align: right;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: #0f172a;
  }
`;

const SortIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  opacity: 0.9;
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
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('offerId');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir('offerId'));
  const [page, setPage] = useState(0);

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

  const sorted = useMemo(
    () => sortEngagementRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalCount) / PAGE_SIZE));
  const lastPage = totalPages - 1;

  useEffect(() => {
    setPage(0);
  }, [q]);

  const safePage = Math.min(page, lastPage);

  useEffect(() => {
    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [page, lastPage]);

  const paged = useMemo(
    () => sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [sorted, safePage]
  );

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir(key));
    }
    setPage(0);
  };

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

  const handlePdf = async (offerId: number) => {
    const key = String(offerId);
    setPdfBusy(key);
    try {
      await openAdminOfferPdfInNewTab(offerId, true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'שגיאה בטעינת PDF');
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div>
      <Title>הצעות — צפיות וחתימה</Title>
      <Subtitle>
        פתיחות הקישור החיצוני נספרות בכל טעינת דף של הלקוח; סטטוס ההצעה מהמערכת; חתימה מוצגת כאשר נרשמה חתימה על הצעה דרך קישור השיתוף. מוצגים עד {PAGE_SIZE} שורות בכל עמוד; אפשר למיין בלחיצה על כותרת עמודה.
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
                <Th aria-sort={sortKey === 'offerId' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('offerId')}>
                    #
                    <SortIcon>
                      {sortKey === 'offerId' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'title' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('title')}>
                    כותרת
                    <SortIcon>
                      {sortKey === 'title' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'user' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('user')}>
                    בעלים
                    <SortIcon>
                      {sortKey === 'user' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'customer' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('customer')}>
                    לקוח
                    <SortIcon>
                      {sortKey === 'customer' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('status')}>
                    סטטוס
                    <SortIcon>
                      {sortKey === 'status' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'opens' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('opens')}>
                    <Link2 size={14} style={{ verticalAlign: 'middle', marginLeft: 4, flexShrink: 0 }} />
                    פתיחות קישור
                    <SortIcon>
                      {sortKey === 'opens' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'lastView' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('lastView')}>
                    צפייה אחרונה
                    <SortIcon>
                      {sortKey === 'lastView' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'isSigned' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('isSigned')}>
                    נחתם?
                    <SortIcon>
                      {sortKey === 'isSigned' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th aria-sort={sortKey === 'signedAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <ThButton type="button" onClick={() => onSort('signedAt')}>
                    מועד חתימה
                    <SortIcon>
                      {sortKey === 'signedAt' && (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </SortIcon>
                  </ThButton>
                </Th>
                <Th>PDF</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
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
                  <Td>
                    <PdfCell>
                      <PdfBtn
                        type="button"
                        disabled={pdfBusy !== null || !r.isSigned}
                        title={
                          r.isSigned
                            ? 'פתיחת PDF כולל בלוק החתימה'
                            : 'אין מסמך PDF חתום במערכת עבור הצעה זו'
                        }
                        onClick={() => handlePdf(r.offerId)}
                      >
                        <FileText size={14} />
                        חתום
                      </PdfBtn>
                    </PdfCell>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {totalCount > 0 && (
            <Pagination>
              <span>
                {totalCount} {totalCount === 1 ? 'רשומה' : 'רשומות'}
                {totalPages > 1 && ` • עמוד ${safePage + 1} מתוך ${totalPages}`}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Btn
                  type="button"
                  disabled={safePage === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronRight size={18} />
                  הקודם
                </Btn>
                <Btn
                  type="button"
                  disabled={safePage >= lastPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  הבא
                  <ChevronLeft size={18} />
                </Btn>
              </div>
            </Pagination>
          )}
        </TableWrap>
      )}
      {!loading && raw.length > 0 && filtered.length === 0 && (
        <Empty>אין תוצאות לחיפוש.</Empty>
      )}
    </div>
  );
}
