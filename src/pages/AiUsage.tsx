import { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import {
  adminApi,
  type AdminAiUsageRowDto,
  type AdminAiUsageLogDto,
  type AdminUpdateUserAiQuotaDto,
} from '../api/adminApi';
import { RefreshCw, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

const PageWrap = styled.div`
  direction: rtl;
  text-align: right;
`;

const Title = styled.h1`
  margin: 0 0 1rem 0;
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
  &:hover:not(:disabled) {
    opacity: 0.92;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 0.875rem;
`;

const Th = styled.th`
  text-align: right;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 0.65rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
`;

const Panel = styled.div`
  margin-top: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const Label = styled.label`
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const Input = styled.input`
  width: 100%;
  max-width: 200px;
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  text-align: right;
`;

const LogsBox = styled.div`
  margin-top: 1rem;
  max-height: 240px;
  overflow: auto;
  font-size: 0.8125rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem;
`;

function normLog(x: unknown): AdminAiUsageLogDto {
  const row = x as Record<string, unknown>;
  return {
    id: (row.id ?? row.Id ?? 0) as number,
    createdAt: (row.createdAt ?? row.CreatedAt ?? '') as string,
    operation: (row.operation ?? row.Operation ?? '') as string,
    inputTokens: (row.inputTokens ?? row.InputTokens ?? 0) as number,
    outputTokens: (row.outputTokens ?? row.OutputTokens ?? 0) as number,
    totalTokens: (row.totalTokens ?? row.TotalTokens ?? 0) as number,
    success: (row.success ?? row.Success ?? true) as boolean,
  };
}

export default function AiUsage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminAiUsageRowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [logsByUser, setLogsByUser] = useState<Record<number, AdminAiUsageLogDto[]>>({});
  const [logsOpen, setLogsOpen] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<number, AdminUpdateUserAiQuotaDto>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAiUsageOverview();
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת נתוני AI');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  const openEdit = (r: AdminAiUsageRowDto) => {
    setExpanded(r.userId);
    setEditForm((prev) => ({
      ...prev,
      [r.userId]: {
        bonusMonthlyRequests: r.bonusMonthlyRequests,
        bonusMonthlyTokens: r.bonusMonthlyTokens,
        overrideRequestLimit: r.overrideRequestLimit ?? null,
        overrideTokenLimit: r.overrideTokenLimit ?? null,
      },
    }));
  };

  const loadLogs = async (userId: number) => {
    try {
      const res = await adminApi.getAiUsageLogs(userId, { limit: 80, offset: 0 });
      const raw = res.data?.items ?? (res.data as { Items?: unknown[] })?.Items ?? [];
      const items = Array.isArray(raw) ? raw.map((x) => normLog(x)) : [];
      setLogsByUser((prev) => ({ ...prev, [userId]: items }));
    } catch {
      setLogsByUser((prev) => ({ ...prev, [userId]: [] }));
    }
  };

  const toggleLogs = async (userId: number) => {
    if (logsOpen === userId) {
      setLogsOpen(null);
      return;
    }
    setLogsOpen(userId);
    if (!logsByUser[userId]) await loadLogs(userId);
  };

  const saveQuota = async (userId: number) => {
    const f = editForm[userId];
    if (!f) return;
    setSaving(userId);
    setError(null);
    try {
      await adminApi.updateUserAiQuota(userId, {
        bonusMonthlyRequests: Number(f.bonusMonthlyRequests) || 0,
        bonusMonthlyTokens: Number(f.bonusMonthlyTokens) || 0,
        overrideRequestLimit:
          f.overrideRequestLimit === null || f.overrideRequestLimit === undefined
            ? null
            : Number(f.overrideRequestLimit),
        overrideTokenLimit:
          f.overrideTokenLimit === null || f.overrideTokenLimit === undefined
            ? null
            : Number(f.overrideTokenLimit),
      });
      await load();
      setExpanded(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה');
    } finally {
      setSaving(null);
    }
  };

  return (
    <PageWrap>
      <Title>שימוש ומכסות AI</Title>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        סיכום חודשי (UTC) לפי מנוי פעיל, בונוס ועקיפות למשתמש.
      </p>
      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      <Btn type="button" onClick={() => void load()} disabled={loading} $secondary>
        <RefreshCw size={16} />
        רענן
      </Btn>

      {loading && rows.length === 0 ? (
        <p style={{ marginTop: '1rem', color: '#64748b' }}>טוען...</p>
      ) : (
        <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <Th>משתמש</Th>
                <Th>חבילה</Th>
                <Th>בקשות</Th>
                <Th>טוקנים</Th>
                <Th>בונוס / עקיפה</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.userId}>
                  <tr>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                        {r.email}
                      </div>
                    </Td>
                    <Td>
                      {r.planName || '—'}
                      {r.planCode ? (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '0.35rem' }}>
                          ({r.planCode})
                        </span>
                      ) : null}
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.periodYearMonth}</div>
                    </Td>
                    <Td>
                      {r.requestsUsed} / {r.effectiveRequestLimit}
                    </Td>
                    <Td>
                      {r.tokensUsed}
                      {r.effectiveTokenLimit != null ? ` / ${r.effectiveTokenLimit}` : ' (ללא תקרה)'}
                    </Td>
                    <Td style={{ fontSize: '0.8125rem' }}>
                      +{r.bonusMonthlyRequests} בקשות, +{r.bonusMonthlyTokens} טוקנים
                      <br />
                      עקיפה: {r.overrideRequestLimit ?? '—'} / {r.overrideTokenLimit ?? '—'}
                    </Td>
                    <Td>
                      <Btn type="button" $secondary onClick={() => openEdit(r)}>
                        <Pencil size={14} />
                        עריכה
                      </Btn>
                      <Btn
                        type="button"
                        $secondary
                        style={{ marginRight: '0.35rem' }}
                        onClick={() => void toggleLogs(r.userId)}
                      >
                        {logsOpen === r.userId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        לוג
                      </Btn>
                    </Td>
                  </tr>
                  {logsOpen === r.userId && (
                    <tr>
                      <Td colSpan={6}>
                        <LogsBox>
                          {(logsByUser[r.userId] ?? []).length === 0 ? (
                            <span style={{ color: '#94a3b8' }}>אין רשומות או טוען…</span>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                {(logsByUser[r.userId] ?? []).map((l) => (
                                  <tr key={l.id}>
                                    <td style={{ padding: '0.25rem', color: '#64748b' }}>
                                      {new Date(l.createdAt).toLocaleString('he-IL')}
                                    </td>
                                    <td style={{ padding: '0.25rem' }}>{l.operation}</td>
                                    <td style={{ padding: '0.25rem', direction: 'ltr', textAlign: 'right' }}>
                                      in {l.inputTokens} / out {l.outputTokens} / Σ {l.totalTokens}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </LogsBox>
                      </Td>
                    </tr>
                  )}
                  {expanded === r.userId && editForm[r.userId] && (
                    <tr>
                      <Td colSpan={6}>
                        <Panel>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <Label>בונוס בקשות חודשי</Label>
                              <Input
                                type="number"
                                min={0}
                                value={editForm[r.userId].bonusMonthlyRequests}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [r.userId]: {
                                      ...prev[r.userId]!,
                                      bonusMonthlyRequests: parseInt(e.target.value, 10) || 0,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>בונוס טוקנים חודשי</Label>
                              <Input
                                type="number"
                                min={0}
                                value={editForm[r.userId].bonusMonthlyTokens}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [r.userId]: {
                                      ...prev[r.userId]!,
                                      bonusMonthlyTokens: parseInt(e.target.value, 10) || 0,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>עקיפת תקרת בקשות (ריק = ביטול)</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="ריק"
                                value={editForm[r.userId].overrideRequestLimit ?? ''}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [r.userId]: {
                                      ...prev[r.userId]!,
                                      overrideRequestLimit:
                                        e.target.value === '' ? null : parseInt(e.target.value, 10),
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>עקיפת תקרת טוקנים (ריק = ביטול)</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="ריק"
                                value={editForm[r.userId].overrideTokenLimit ?? ''}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [r.userId]: {
                                      ...prev[r.userId]!,
                                      overrideTokenLimit:
                                        e.target.value === '' ? null : parseInt(e.target.value, 10),
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <Btn type="button" onClick={() => void saveQuota(r.userId)} disabled={saving === r.userId}>
                              שמור
                            </Btn>
                            <Btn
                              type="button"
                              $secondary
                              onClick={() => {
                                setExpanded(null);
                              }}
                            >
                              סגור
                            </Btn>
                          </div>
                        </Panel>
                      </Td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </PageWrap>
  );
}
