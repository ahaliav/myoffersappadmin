import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react';
import { aiArchitectureApi, type AiToolDbDto } from '../api/adminApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.5rem; font-size: 0.875rem; line-height: 1.6;`;

const Btn = styled.button<{ $secondary?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  background: ${({ $secondary }) => $secondary ? '#f1f5f9' : '#3b82f6'};
  color: ${({ $secondary }) => $secondary ? '#334155' : 'white'};
  border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer;
  &:hover:not(:disabled) { opacity: 0.88; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Table = styled.table`width: 100%; border-collapse: collapse; font-size: 0.875rem;`;
const Th = styled.th`text-align: right; padding: 0.6rem 1rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;`;
const Td = styled.td`padding: 0.65rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle;`;
const Tr = styled.tr`&:hover { background: #fafafa; }`;

const Badge = styled.span<{ $color: 'green' | 'red' | 'blue' | 'gray' }>`
  display: inline-block; font-size: 0.72rem; padding: 0.15rem 0.55rem; border-radius: 999px; font-weight: 500;
  background: ${({ $color }) => ({ green: '#dcfce7', red: '#fef2f2', blue: '#dbeafe', gray: '#f1f5f9' })[$color]};
  color: ${({ $color }) => ({ green: '#16a34a', red: '#dc2626', blue: '#2563eb', gray: '#64748b' })[$color]};
`;

const ScopeColors: Record<string, 'blue' | 'gray'> = { user: 'blue', admin: 'gray', both: 'blue' };

const SchemaBox = styled.pre`
  font-size: 0.72rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
  padding: 0.4rem 0.6rem; max-height: 120px; overflow: auto; text-align: left; direction: ltr;
  white-space: pre-wrap; margin: 0;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem;
  border: none; border-radius: 6px; font-size: 0.78rem; cursor: pointer;
  background: ${({ $active }) => $active ? '#fef2f2' : '#dcfce7'};
  color: ${({ $active }) => $active ? '#dc2626' : '#16a34a'};
  &:hover { opacity: 0.8; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default function AiToolsRegistry() {
  const [tools, setTools] = useState<AiToolDbDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [expandedSchema, setExpandedSchema] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { const r = await aiArchitectureApi.getAiTools(); setTools(r.data); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (tool: AiToolDbDto) => {
    setToggling(tool.id);
    try { await aiArchitectureApi.toggleAiTool(tool.id, !tool.isActive); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
    finally { setToggling(null); }
  };

  return (
    <PageWrap>
      <Title>רישום כלים (Tool Registry)</Title>
      <Desc>
        כלי ה-AI הרשומים ב-DB. כלים עם <strong>requires_confirmation</strong> מציגים תצוגה מקדימה ומבקשים אישור לפני ביצוע.
        הפעל/כבה כל כלי בזמן ריצה ללא פריסה מחדש.
      </Desc>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ marginBottom: '1rem' }}>
        <Btn $secondary onClick={load} disabled={loading}><RefreshCw size={15} />רענן</Btn>
      </div>

      {loading && tools.length === 0 ? (
        <p style={{ color: '#64748b' }}>טוען...</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)' }}>
          <Table>
            <thead>
              <tr>
                <Th>שם</Th>
                <Th>תיאור</Th>
                <Th>Scope</Th>
                <Th>אישור נדרש</Th>
                <Th>סטטוס</Th>
                <Th>JSON Schema</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.displayName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{t.name}</div>
                  </Td>
                  <Td style={{ maxWidth: 260, color: '#475569' }}>{t.description}</Td>
                  <Td><Badge $color={ScopeColors[t.scope] ?? 'gray'}>{t.scope}</Badge></Td>
                  <Td>
                    {t.requiresConfirmation
                      ? <Badge $color="red">כן</Badge>
                      : <Badge $color="gray">לא</Badge>}
                  </Td>
                  <Td><Badge $color={t.isActive ? 'green' : 'red'}>{t.isActive ? 'פעיל' : 'כבוי'}</Badge></Td>
                  <Td>
                    <button
                      style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.78rem' }}
                      onClick={() => setExpandedSchema(expandedSchema === t.id ? null : t.id)}
                    >
                      {expandedSchema === t.id ? 'הסתר' : 'הצג schema'}
                    </button>
                    {expandedSchema === t.id && (
                      <SchemaBox>{JSON.stringify(JSON.parse(t.jsonSchema), null, 2)}</SchemaBox>
                    )}
                  </Td>
                  <Td>
                    <ToggleBtn
                      $active={t.isActive}
                      onClick={() => toggle(t)}
                      disabled={toggling === t.id}
                    >
                      {t.isActive ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      {t.isActive ? 'כבה' : 'הפעל'}
                    </ToggleBtn>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </PageWrap>
  );
}
