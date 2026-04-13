import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi, type AiPromptDto } from '../api/adminApi';
import { RefreshCw, Save, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function Prompts() {
  const [list, setList] = useState<AiPromptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Record<number, Partial<AiPromptDto>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

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
          const e = editing[p.id];
          return (
            <Card key={p.id}>
              <CardHeader onClick={() => setExpandedId(isOpen ? null : p.id)}>
                <span>
                  {p.name}
                  <KeyBadge> {p.key}</KeyBadge>
                </span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </CardHeader>
              {isOpen && (
                <CardBody>
                  {e ? (
                    <>
                      <div>
                        <Label>שם (תצוגה)</Label>
                        <Input
                          value={e.name ?? ''}
                          onChange={(ev) => setEdit(p.id, 'name', ev.target.value)}
                        />
                      </div>
                      <div>
                        <Label>System prompt</Label>
                        <TextArea
                          value={e.systemPrompt ?? ''}
                          onChange={(ev) => setEdit(p.id, 'systemPrompt', ev.target.value)}
                          rows={6}
                        />
                      </div>
                      <div>
                        <Label>
                          תבנית הודעת משתמש — הצעות: {'{title}'}, {'{examples}'}, {'{text}'}, {'{instruction}'}; עמוד נתונים:{' '}
                          {'{data}'}, {'{user_question}'}
                        </Label>
                        <TextArea
                          value={e.userPromptTemplate ?? ''}
                          onChange={(ev) => setEdit(p.id, 'userPromptTemplate', ev.target.value)}
                          rows={4}
                          placeholder="אופציונלי - השאר ריק לשימוש בברירת מחדל"
                        />
                      </div>
                      <div>
                        <Label>מודל (למשל gpt-4o-mini)</Label>
                        <Input
                          value={e.model ?? ''}
                          onChange={(ev) => setEdit(p.id, 'model', ev.target.value)}
                          placeholder="gpt-4o-mini"
                        />
                      </div>
                      <div>
                        <Label>Sort order</Label>
                        <Input
                          type="number"
                          value={e.sortOrder ?? 0}
                          onChange={(ev) => setEdit(p.id, 'sortOrder', parseInt(ev.target.value, 10) || 0)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '0.5rem', marginTop: '1rem' }}>
                        <Btn onClick={() => save(p.id)} disabled={savingId === p.id}>
                          <Save size={16} />
                          {savingId === p.id ? 'שומר...' : 'שמור'}
                        </Btn>
                        <Btn
                          $secondary
                          onClick={() => {
                            setEditing((prev) => {
                              const next = { ...prev };
                              delete next[p.id];
                              return next;
                            });
                          }}
                        >
                          ביטול
                        </Btn>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Btn onClick={() => startEdit(p)}>ערוך</Btn>
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
