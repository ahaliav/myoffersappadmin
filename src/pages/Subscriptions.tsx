import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi, type SubscriptionAdminDto } from '../api/adminApi';
import { RefreshCw } from 'lucide-react';

const PageWrap = styled.div`
  direction: rtl;
  text-align: right;
`;

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Btn = styled.button<{ $secondary?: boolean }>`
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ $secondary }) => ($secondary ? '#f1f5f9' : '#3b82f6')};
  color: ${({ $secondary }) => ($secondary ? '#334155' : 'white')};
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: ${({ $secondary }) => ($secondary ? '#e2e8f0' : '#2563eb')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  padding: 0.75rem 1rem;
  text-align: right;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
`;

const Tr = styled.tr`
  &:last-child ${Td} {
    border-bottom: none;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $status }) =>
    $status === 'active' ? '#dcfce7' : $status === 'expired' ? '#fee2e2' : $status === 'cancelled' ? '#fef3c7' : '#f1f5f9'};
  color: ${({ $status }) =>
    $status === 'active' ? '#166534' : $status === 'expired' ? '#991b1b' : $status === 'cancelled' ? '#92400e' : '#475569'};
`;

function norm(row: Record<string, unknown>): SubscriptionAdminDto {
  return {
    id: (row.id ?? row.Id ?? 0) as number,
    userId: (row.userId ?? row.UserId ?? 0) as number,
    userName: (row.userName ?? row.UserName ?? '') as string,
    userEmail: (row.userEmail ?? row.UserEmail ?? '') as string,
    planId: (row.planId ?? row.PlanId ?? 0) as number,
    planName: (row.planName ?? row.PlanName ?? '') as string,
    planCode: (row.planCode ?? row.PlanCode ?? '') as string,
    isTrial: (row.isTrial ?? row.IsTrial ?? false) as boolean,
    trialStartDate: (row.trialStartDate ?? row.TrialStartDate ?? null) as string | null,
    trialEndDate: (row.trialEndDate ?? row.TrialEndDate ?? null) as string | null,
    startDate: (row.startDate ?? row.StartDate ?? '') as string,
    endDate: (row.endDate ?? row.EndDate ?? null) as string | null,
    amount: (row.amount ?? row.Amount ?? 0) as number,
    status: (row.status ?? row.Status ?? '') as string,
    autoRenew: (row.autoRenew ?? row.AutoRenew ?? false) as boolean,
    renewalDiscountPercent: (row.renewalDiscountPercent ?? row.RenewalDiscountPercent ?? null) as number | null,
    createdAt: (row.createdAt ?? row.CreatedAt ?? '') as string,
    updatedAt: (row.updatedAt ?? row.UpdatedAt ?? '') as string,
  };
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('he-IL', { dateStyle: 'short' });
  } catch {
    return s;
  }
}

export default function Subscriptions() {
  const [list, setList] = useState<SubscriptionAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSubscriptions();
      const data = Array.isArray(res.data) ? res.data : [];
      setList(data.map((x) => norm(x as unknown as Record<string, unknown>)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת המנויים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && list.length === 0) {
    return (
      <PageWrap>
        <Title>מנויים</Title>
        <p style={{ color: '#64748b' }}>טוען...</p>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <Title>מנויים</Title>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        רשימת כל המנויים במערכת — משתמש, תוכנית, סטטוס ותאריכים.
      </p>
      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      <div style={{ marginBottom: '1rem' }}>
        <Btn onClick={load} disabled={loading} $secondary>
          <RefreshCw size={16} />
          רענן
        </Btn>
      </div>
      {list.length === 0 ? (
        <p style={{ color: '#64748b' }}>אין מנויים.</p>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>משתמש</Th>
                <Th>תוכנית</Th>
                <Th>סטטוס</Th>
                <Th>תאריך התחלה</Th>
                <Th>תאריך סיום</Th>
                <Th>ניסיון</Th>
                <Th>סכום</Th>
                <Th>חידוש אוטומטי</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div>{s.userName || '—'}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{s.userEmail || '—'}</div>
                  </Td>
                  <Td>
                    {s.planName} <span style={{ color: '#64748b' }}>({s.planCode})</span>
                  </Td>
                  <Td>
                    <StatusBadge $status={s.status}>{s.status}</StatusBadge>
                  </Td>
                  <Td>{formatDate(s.startDate)}</Td>
                  <Td>{formatDate(s.endDate)}</Td>
                  <Td>
                    {s.isTrial
                      ? `${formatDate(s.trialStartDate)} – ${formatDate(s.trialEndDate)}`
                      : '—'}
                  </Td>
                  <Td>{typeof s.amount === 'number' ? `₪${s.amount}` : '—'}</Td>
                  <Td>{s.autoRenew ? 'כן' : 'לא'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </PageWrap>
  );
}
