import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi } from '../api/adminApi';
import { FileText, Users, Activity } from 'lucide-react';

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
`;

const Card = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e2e8f0;
`;

const CardIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: ${({ $color }) => $color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const CardLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const CardValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const Message = styled.p`
  color: #64748b;
  margin: 1rem 0 0 0;
`;

export default function Dashboard() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [logCount, setLogCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [usersRes, logsRes] = await Promise.all([
          adminApi.getUsers(),
          adminApi.getLogs({ limit: 1, offset: 0 }),
        ]);
        if (!cancelled) {
          setUserCount(usersRes.data.length);
          const d = logsRes.data;
          setLogCount(d.total ?? d.Total ?? 0);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'שגיאה בטעינת נתונים');
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Title>לוח בקרה</Title>
      {error && <Message style={{ color: '#dc2626' }}>{error}</Message>}
      <Cards>
        <Card>
          <CardIcon $color="rgba(59, 130, 246, 0.9)">
            <Users size={24} />
          </CardIcon>
          <CardLabel>משתמשים רשומים</CardLabel>
          <CardValue>{userCount ?? '–'}</CardValue>
        </Card>
        <Card>
          <CardIcon $color="rgba(16, 185, 129, 0.9)">
            <FileText size={24} />
          </CardIcon>
          <CardLabel>רישומי לוג</CardLabel>
          <CardValue>{logCount ?? '–'}</CardValue>
        </Card>
        <Card>
          <CardIcon $color="rgba(139, 92, 246, 0.9)">
            <Activity size={24} />
          </CardIcon>
          <CardLabel>מערכת</CardLabel>
          <CardValue>פעיל</CardValue>
        </Card>
      </Cards>
    </>
  );
}
