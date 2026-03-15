import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi, normalizeLog } from '../api/adminApi';
import type { ApplicationLogDto } from '../api/adminApi';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
  cursor: pointer;
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

const TableWrap = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  text-align: right;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: top;
`;

const Tr = styled.tr<{ $level?: string }>`
  ${({ $level }) =>
    $level === 'Error' && 'background: #fef2f2;'}
  ${({ $level }) =>
    $level === 'Warning' && 'background: #fffbeb;'}
`;

const LevelBadge = styled.span<{ $level: string }>`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $level }) =>
    $level === 'Error' ? '#fecaca' : $level === 'Warning' ? '#fde68a' : '#dbeafe'};
  color: ${({ $level }) =>
    $level === 'Error' ? '#b91c1c' : $level === 'Warning' ? '#92400e' : '#1d4ed8'};
`;

const MessageCell = styled.div`
  max-width: 420px;
  word-break: break-word;
  white-space: pre-wrap;
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;
`;

const PAGE_SIZE = 50;

export default function Logs() {
  const [items, setItems] = useState<ApplicationLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [level, setLevel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getLogs({
        limit: PAGE_SIZE,
        offset,
        level: level || undefined,
      });
      const d = res.data;
      setItems(d.items ?? d.Items ?? []);
      setTotal(d.total ?? d.Total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת לוגים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [offset, level]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <>
      <Title>לוגים</Title>
      <Toolbar>
        <Select value={level} onChange={(e) => { setLevel(e.target.value); setOffset(0); }}>
          <option value="">כל הרמות</option>
          <option value="Information">Information</option>
          <option value="Warning">Warning</option>
          <option value="Error">Error</option>
        </Select>
        <Btn onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          רענן
        </Btn>
      </Toolbar>
      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>תאריך</Th>
              <Th>רמה</Th>
              <Th>קטגוריה</Th>
              <Th>הודעה</Th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <Td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  טוען...
                </Td>
              </tr>
            ) : (
              items.map((row) => {
                const r = normalizeLog(row);
                return (
                  <Tr key={r.id} $level={r.level}>
                    <Td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleString('he-IL')}
                    </Td>
                    <Td>
                      <LevelBadge $level={r.level}>{r.level}</LevelBadge>
                    </Td>
                    <Td>{r.category}</Td>
                    <Td>
                      <MessageCell>
                        {r.message}
                        {r.exception && (
                          <pre style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            {r.exception}
                          </pre>
                        )}
                      </MessageCell>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
        <Pagination>
          <span>
            {total} רשומות
            {totalPages > 1 && ` • עמוד ${currentPage} מתוך ${totalPages}`}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Btn
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              <ChevronRight size={18} />
              הקודם
            </Btn>
            <Btn
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              הבא
              <ChevronLeft size={18} />
            </Btn>
          </div>
        </Pagination>
      </TableWrap>
    </>
  );
}
