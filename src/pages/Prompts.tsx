import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi, aiArchitectureApi, type AiPromptDto, type PromptVersionDto, type DataVariableDto, type PromptDataBindingDto } from '../api/adminApi';
import { RefreshCw, Save, ChevronDown, ChevronUp, History, RotateCcw, Link, Plus, Trash2, Camera } from 'lucide-react';

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

const Card = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const CardHeader = styled.button`
  width: 100%;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #fafafa;
  border: none;
  cursor: pointer;
  text-align: right;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;

  &:hover {
    background: #f1f5f9;
  }
`;

const CardBody = styled.div`
  padding: 1.25rem;
  border-top: 1px solid #e2e8f0;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 0.35rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9375rem;
  margin-bottom: 1rem;
  text-align: right;
  direction: rtl;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  margin-bottom: 1rem;
  resize: vertical;
  text-align: right;
  direction: rtl;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const KeyBadge = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 400;
  margin-inline-start: 0.5rem;
`;

const TabBar = styled.div`
  display: flex;
  flex-direction: row-reverse;
  gap: 0.25rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1rem;
`;

const Tab = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#3b82f6' : 'transparent')};
  color: ${({ $active }) => ($active ? '#3b82f6' : '#64748b')};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  margin-bottom: -1px;
`;

const VersionRow = styled.div`
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
`;

const SmallBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.55rem;
  border: none;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  background: ${({ $danger }) => ($danger ? '#fef2f2' : '#f1f5f9')};
  color: ${({ $danger }) => ($danger ? '#dc2626' : '#334155')};
  &:hover { opacity: 0.8; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const BindingRow = styled.div`
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 0.4rem;
  font-size: 0.82rem;
`;

const SmallInput = styled.input`
  padding: 0.25rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.82rem;
  text-align: right;
  direction: rtl;
  &:focus { outline: none; border-color: #3b82f6; }
`;

const SmallSelect = styled.select`
  padding: 0.25rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.82rem;
  background: white;
  &:focus { outline: none; border-color: #3b82f6; }
`;

function norm(p: AiPromptDto | Record<string, unknown>): AiPromptDto {
  return {
    id: (p as any).id ?? (p as any).Id ?? 0,
    key: (p as any).key ?? (p as any).Key ?? '',
    name: (p as any).name ?? (p as any).Name ?? '',
    systemPrompt: (p as any).systemPrompt ?? (p as any).SystemPrompt ?? '',
    userPromptTemplate: (p as any).userPromptTemplate ?? (p as any).UserPromptTemplate ?? null,
    model: (p as any).model ?? (p as any).Model ?? null,
    sortOrder: (p as any).sortOrder ?? (p as any).SortOrder ?? 0,
    createdAt: (p as any).createdAt ?? (p as any).CreatedAt ?? '',
    updatedAt: (p as any).updatedAt ?? (p as any).UpdatedAt ?? '',
  };
}

type CardTab = 'edit' | 'versions' | 'bindings';

export default function Prompts() {
  const [list, setList] = useState<AiPromptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Record<number, Partial<AiPromptDto>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, CardTab>>({});

  // Versions state
  const [versions, setVersions] = useState<Record<number, PromptVersionDto[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<Record<number, boolean>>({});
  const [snapshotNotes, setSnapshotNotes] = useState<Record<number, string>>({});

  // Bindings state
  const [bindings, setBindings] = useState<Record<number, PromptDataBindingDto[]>>({});
  const [loadingBindings, setLoadingBindings] = useState<Record<number, boolean>>({});
  const [allVariables, setAllVariables] = useState<DataVariableDto[]>([]);
  const [newBinding, setNewBinding] = useState<Record<number, { variableId: number; placeholderKey: string }>>({});

  const loadVersions = async (promptId: number) => {
    setLoadingVersions((p) => ({ ...p, [promptId]: true }));
    try {
      const r = await aiArchitectureApi.getPromptVersions(promptId);
      setVersions((p) => ({ ...p, [promptId]: r.data }));
    } catch { /* ignore */ }
    finally { setLoadingVersions((p) => ({ ...p, [promptId]: false })); }
  };

  const loadBindings = async (promptId: number) => {
    setLoadingBindings((p) => ({ ...p, [promptId]: true }));
    try {
      const r = await aiArchitectureApi.getPromptBindings(promptId);
      setBindings((p) => ({ ...p, [promptId]: r.data }));
    } catch { /* ignore */ }
    finally { setLoadingBindings((p) => ({ ...p, [promptId]: false })); }
  };

  const ensureVariables = async () => {
    if (allVariables.length > 0) return;
    try { const r = await aiArchitectureApi.getDataVariables(); setAllVariables(r.data); } catch { /* ignore */ }
  };

  const switchTab = (promptId: number, tab: CardTab) => {
    setActiveTab((p) => ({ ...p, [promptId]: tab }));
    if (tab === 'versions' && !versions[promptId]) loadVersions(promptId);
    if (tab === 'bindings') { if (!bindings[promptId]) loadBindings(promptId); ensureVariables(); }
  };

  const snapshot = async (promptId: number) => {
    try {
      await aiArchitectureApi.snapshotPrompt(promptId, snapshotNotes[promptId] ?? '');
      await loadVersions(promptId);
      setSnapshotNotes((p) => ({ ...p, [promptId]: '' }));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
  };

  const rollback = async (promptId: number, versionNumber: number) => {
    if (!confirm(`לחזור לגרסה ${versionNumber}?`)) return;
    try { await aiArchitectureApi.rollbackPrompt(promptId, versionNumber); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
  };

  const addBinding = async (promptId: number) => {
    const nb = newBinding[promptId];
    if (!nb?.variableId || !nb?.placeholderKey) return;
    try {
      await aiArchitectureApi.createPromptBinding({ promptId, variableId: nb.variableId, placeholderKey: nb.placeholderKey, sortOrder: (bindings[promptId]?.length ?? 0) });
      await loadBindings(promptId);
      setNewBinding((p) => ({ ...p, [promptId]: { variableId: 0, placeholderKey: '' } }));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
  };

  const removeBinding = async (promptId: number, bindingId: number) => {
    try { await aiArchitectureApi.deletePromptBinding(bindingId); await loadBindings(promptId); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAiPrompts();
      const data = Array.isArray(res.data) ? res.data : [];
      setList(data.map(norm));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הפרומפטים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: AiPromptDto) => {
    setExpandedId(p.id);
    setEditing((prev) => ({
      ...prev,
      [p.id]: {
        name: p.name,
        systemPrompt: p.systemPrompt,
        userPromptTemplate: p.userPromptTemplate ?? '',
        model: p.model ?? '',
        sortOrder: p.sortOrder,
      },
    }));
  };

  const setEdit = (id: number, field: keyof AiPromptDto, value: string | number) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const save = async (id: number) => {
    const e = editing[id];
    if (!e) return;
    setSavingId(id);
    try {
      await adminApi.updateAiPrompt(id, {
        name: e.name ?? '',
        systemPrompt: e.systemPrompt ?? '',
        userPromptTemplate: e.userPromptTemplate ?? undefined,
        model: e.model ?? undefined,
        sortOrder: typeof e.sortOrder === 'number' ? e.sortOrder : 0,
      });
      await load();
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setSavingId(null);
    }
  };

  if (loading && list.length === 0) {
    return (
      <PageWrap>
        <Title>פרומפטים של AI</Title>
        <p style={{ color: '#64748b' }}>טוען...</p>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <Title>פרומפטים של AI</Title>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        ניהול פרומפטי AI: הצעות מחיר — {'{title}'}, {'{description}'}, {'{examples}'}, {'{text}'}, {'{instruction}'}.
        עמוד נתונים (זמן סגירה) — מפתח גלובלי <code>data_avg_close_global</code> (ממוזג ל-system של כל כפתור), ובתבנית משתמש:{' '}
        {'{data}'}, {'{data_json}'}, {'{user_question}'}. מפתחות כפתורים: avg_time_pipeline, avg_time_fastest_work, avg_time_fastest_client,
        avg_time_lost_money, avg_time_close_faster, avg_time_free_chat.
        אחוזי סגירה: מפתח גלובלי <code>close_rate_global</code>; כפתורים: close_rate_how_am_i_doing, close_rate_best_work,
        close_rate_worst, close_rate_what_changed, close_rate_how_to_improve, close_rate_free_chat. אותם placeholders:{' '}
        {'{data}'}, {'{user_question}'}.
        אזורים (Areas AI): מפתח גלובלי <code>areas_global</code>; כפתורים: areas_best_to_advertise, areas_not_worth_it,
        areas_went_cold, areas_most_money, areas_why_not_closing, areas_free_chat. אותם placeholders: {'{data}'}, {'{user_question}'}.
        דירוג עבודות (Ranking AI): מפתח גלובלי <code>ranking_global</code>; כפתורים: ranking_best_work, ranking_waste_of_time,
        ranking_why_changed, ranking_earn_more, ranking_money_left, ranking_free_chat.
        סטטוסים (Status AI): מפתח גלובלי <code>status_global</code>; כפתורים: status_money_waiting, status_call_back_now,
        status_why_lost, status_save_expired, status_what_to_do_now, status_free_chat.
      </p>
      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      <div style={{ marginBottom: '1rem' }}>
        <Btn onClick={load} disabled={loading} $secondary>
          <RefreshCw size={16} />
          רענן
        </Btn>
      </div>
      {list.length === 0 ? (
        <p style={{ color: '#64748b' }}>אין פרומפטים. הרץ את סקריפט ה-DB להזרמת ברירת המחדל.</p>
      ) : (
        list.map((p) => {
          const isOpen = expandedId === p.id;
          const tab = activeTab[p.id] ?? 'edit';
          const e = editing[p.id];
          const pvs = versions[p.id] ?? [];
          const pbs = bindings[p.id] ?? [];
          const nb = newBinding[p.id] ?? { variableId: 0, placeholderKey: '' };

          return (
            <Card key={p.id}>
              <CardHeader onClick={() => { setExpandedId(isOpen ? null : p.id); if (!isOpen) switchTab(p.id, 'edit'); }}>
                <span>
                  {p.name}
                  <KeyBadge> {p.key}</KeyBadge>
                </span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </CardHeader>
              {isOpen && (
                <CardBody>
                  <TabBar>
                    <Tab $active={tab === 'edit'} onClick={() => switchTab(p.id, 'edit')}><Save size={13} />עריכה</Tab>
                    <Tab $active={tab === 'versions'} onClick={() => switchTab(p.id, 'versions')}><History size={13} />גרסאות</Tab>
                    <Tab $active={tab === 'bindings'} onClick={() => switchTab(p.id, 'bindings')}><Link size={13} />משתנים</Tab>
                  </TabBar>

                  {tab === 'edit' && (
                    <>
                      {e ? (
                        <>
                          <div>
                            <Label>שם (תצוגה)</Label>
                            <Input value={e.name ?? ''} onChange={(ev) => setEdit(p.id, 'name', ev.target.value)} />
                          </div>
                          <div>
                            <Label>System prompt</Label>
                            <TextArea value={e.systemPrompt ?? ''} onChange={(ev) => setEdit(p.id, 'systemPrompt', ev.target.value)} rows={6} />
                          </div>
                          <div>
                            <Label>{'תבנית הודעת משתמש – {{placeholder_key}} יוזרקו מהמשתנים'}</Label>
                            <TextArea value={e.userPromptTemplate ?? ''} onChange={(ev) => setEdit(p.id, 'userPromptTemplate', ev.target.value)} rows={4} placeholder="אופציונלי" />
                          </div>
                          <div>
                            <Label>מודל</Label>
                            <Input value={e.model ?? ''} onChange={(ev) => setEdit(p.id, 'model', ev.target.value)} placeholder="gpt-4o-mini" />
                          </div>
                          <div>
                            <Label>Sort order</Label>
                            <Input type="number" value={e.sortOrder ?? 0} onChange={(ev) => setEdit(p.id, 'sortOrder', parseInt(ev.target.value, 10) || 0)} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '0.5rem', marginTop: '1rem' }}>
                            <Btn onClick={() => save(p.id)} disabled={savingId === p.id}><Save size={16} />{savingId === p.id ? 'שומר...' : 'שמור'}</Btn>
                            <Btn $secondary onClick={() => setEditing((prev) => { const n = { ...prev }; delete n[p.id]; return n; })}>ביטול</Btn>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <Btn onClick={() => startEdit(p)}>ערוך</Btn>
                        </div>
                      )}
                    </>
                  )}

                  {tab === 'versions' && (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                        <SmallInput style={{ flex: 1 }} placeholder="הערות לגרסה (אופציונלי)"
                          value={snapshotNotes[p.id] ?? ''} onChange={(ev) => setSnapshotNotes((prev) => ({ ...prev, [p.id]: ev.target.value }))} />
                        <SmallBtn onClick={() => snapshot(p.id)}><Camera size={13} />שמור גרסה</SmallBtn>
                        <SmallBtn onClick={() => loadVersions(p.id)} disabled={loadingVersions[p.id]}><RefreshCw size={12} /></SmallBtn>
                      </div>
                      {loadingVersions[p.id] ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>טוען...</p>
                        : pvs.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>אין גרסאות. לחץ "שמור גרסה" ליצור snapshot.</p>
                        : pvs.map((v) => (
                          <VersionRow key={v.id}>
                            <div>
                              <span style={{ fontWeight: 600 }}>v{v.versionNumber}</span>
                              <span style={{ color: '#94a3b8', marginRight: '0.5rem', fontSize: '0.75rem' }}>{new Date(v.createdAt).toLocaleString('he-IL')}</span>
                              {v.notes && <span style={{ color: '#64748b' }}> – {v.notes}</span>}
                            </div>
                            <SmallBtn onClick={() => rollback(p.id, v.versionNumber)}><RotateCcw size={12} />חזור לגרסה</SmallBtn>
                          </VersionRow>
                        ))}
                    </div>
                  )}

                  {tab === 'bindings' && (
                    <div>
                      <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1rem' }}>
                        {'קשר משתנה לפרומפט – הגדר {{placeholder_key}} בתבנית לציין היכן להזריק.'}
                      </p>
                      {loadingBindings[p.id] ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>טוען...</p>
                        : pbs.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>אין משתנים מקושרים.</p>
                        : pbs.map((b) => (
                          <BindingRow key={b.id}>
                            <SmallBtn $danger onClick={() => removeBinding(p.id, b.id)}><Trash2 size={12} /></SmallBtn>
                            <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                              {`{{${b.placeholderKey}}}`}
                            </code>
                            <span style={{ color: '#94a3b8' }}>←</span>
                            <span style={{ fontWeight: 500 }}>{b.variableKey}</span>
                          </BindingRow>
                        ))}
                      <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                        <SmallSelect value={nb.variableId || ''} onChange={(ev) => setNewBinding((prev) => ({ ...prev, [p.id]: { ...nb, variableId: parseInt(ev.target.value, 10) } }))}>
                          <option value="">בחר משתנה</option>
                          {allVariables.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.key})</option>)}
                        </SmallSelect>
                        <SmallInput placeholder="placeholder_key" value={nb.placeholderKey} style={{ width: 140 }}
                          onChange={(ev) => setNewBinding((prev) => ({ ...prev, [p.id]: { ...nb, placeholderKey: ev.target.value } }))} />
                        <SmallBtn onClick={() => addBinding(p.id)} disabled={!nb.variableId || !nb.placeholderKey}><Plus size={13} />הוסף</SmallBtn>
                      </div>
                    </div>
                  )}
                </CardBody>
              )}
            </Card>
          );
        })
      )}
    </PageWrap>
  );
}
