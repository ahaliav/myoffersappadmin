import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi } from '../api/adminApi';
import type { AdminUser } from '../api/adminApi';
import { RefreshCw, User } from 'lucide-react';

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Toolbar = styled.div`
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

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
`;

const UserCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
`;

const Email = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  direction: ltr;
  text-align: right;
`;

const Meta = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.5rem;
`;

const Empty = styled.p`
  color: #64748b;
  margin: 2rem 0 0 0;
`;

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return s;
    }
  };

  const uid = (u: AdminUser) => u.id ?? u.Id ?? 0;
  const uName = (u: AdminUser) => u.fullName ?? u.FullName ?? 'ללא שם';
  const uEmail = (u: AdminUser) => u.email ?? u.Email ?? '';
  const uCreated = (u: AdminUser) => u.createdAt ?? u.CreatedAt ?? '';

  return (
    <>
      <Title>משתמשים רשומים</Title>
      <Toolbar>
        <Btn onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          רענן
        </Btn>
      </Toolbar>
      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      {loading && users.length === 0 ? (
        <p style={{ color: '#64748b' }}>טוען...</p>
      ) : users.length === 0 ? (
        <Empty>אין משתמשים להצגה.</Empty>
      ) : (
        <CardGrid>
          {users.map((u) => (
            <UserCard key={uid(u)}>
              <Avatar>
                <User size={22} />
              </Avatar>
              <Info>
                <Name>{uName(u)}</Name>
                <Email>{uEmail(u)}</Email>
                <Meta>נרשם: {formatDate(uCreated(u))}</Meta>
              </Info>
            </UserCard>
          ))}
        </CardGrid>
      )}
    </>
  );
}
