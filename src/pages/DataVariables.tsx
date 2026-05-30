import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Plus, Trash2, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { aiArchitectureApi, type DataVariableDto, type DataVariableCreateDto } from '../api/adminApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.5rem; font-size: 0.875rem; line-height: 1.6;`;

const Btn = styled.button<{ $danger?: boolean; $secondary?: boolean }>`
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  background: ${({ $danger, $secondary }) => $danger ? '#dc2626' : $secondary ? '#f1f5f9' : '#3b82f6'};
  color: ${({ $danger, $secondary }) => ($danger || !$secondary) ? 'white' : '#334155'};
  border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer;
  &:hover:not(:disabled) { opacity: 0.88; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Card = styled.div`
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
  margin-bottom: 0.75rem; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.08); overflow: hidden;
`;
const CardHeader = styled.button`
  width: 100%; display: flex; flex-direction: row-reverse; align-items: center;
  justify-content: space-between; padding: 0.9rem 1.25rem; background: #fafafa;
  border: none; cursor: pointer; text-align: right; font-size: 0.95rem; font-weight: 600; color: #0f172a;
  &:hover { background: #f1f5f9; }
`;
const CardBody = styled.div`padding: 1.25rem; border-top: 1px solid #e2e8f0;`;

const Label = styled.label`display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.25rem;`;
const Input = styled.input`
  width: 100%; padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 0.9rem; margin-bottom: 0.75rem; text-align: right; direction: rtl;
  &:focus { outline: none; border-color: #3b82f6; }
`;
const Select = styled.select`
  padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 0.9rem; margin-bottom: 0.75rem; background: white;
  &:focus { outline: none; border-color: #3b82f6; }
`;
const TextArea = styled.textarea`
  width: 100%; padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 0.82rem; font-family: 'Fira Mono', monospace; margin-bottom: 0.75rem;
  resize: vertical; text-align: left; direction: ltr; min-height: 90px;
  &:focus { outline: none; border-color: #3b82f6; }
`;
const Badge = styled.span<{ $active?: boolean }>`
  font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 999px;
  background: ${({ $active }) => $active ? '#dcfce7' : '#fef2f2'};
  color: ${({ $active }) => $active ? '#16a34a' : '#dc2626'};
  margin-inline-start: 0.5rem;
`;
const CreateForm = styled.div`
  background: #f0f9ff; border: 1px dashed #93c5fd; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;
`;
const Row = styled.div`display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;`;

type Editing = { name: string; description: string; sqlQuery: string; resultFormat: string; isActive: boolean };

export default function DataVariables() {
  const [list, setList] = useState<DataVariableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Record<number, Editing>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVar, setNewVar] = useState<DataVariableCreateDto>({ key: '', name: '', description: '', sqlQuery: 'SELECT ... FROM ... WHERE user_id = @user_id', resultFormat: 'json' });

  const load = async () => {
    setLoading(true); setError(null);
    try { const r = await aiArchitectureApi.getDataVariables(); setList(r.data); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'שגיאה'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (v: DataVariableDto) => {
    setExpandedId(v.id);
    setEditing((p) => ({ ...p, [v.id]: { name: v.name, description: v.description ?? '', sqlQuery: v.sqlQuery, resultFormat: v.resultFormat, isActive: v.isActive } }));
  };

  const setField = (id: number, field: keyof Editing, val: string | boolean) =>
    setEditing((p) => ({ ...p, [id]: { ...p[id], [field]: val } }));

  const save = async (id: number) => {
    const e = editing[id]; if (!e) return;
    setSaving(id);
    try { await aiArchitectureApi.updateDataVariable(id, e); await load(); setEditing((p) => { const n = { ...p }; delete n[id]; return n; }); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'שגיאה'); }
    finally { setSaving(null); }
  };

  const remove = async (id: number) => {
    if (!confirm('למחוק את המשתנה?')) return;
    setDeleting(id);
    try { await aiArchitectureApi.deleteDataVariable(id); await load(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'שגיאה'); }
    finally { setDeleting(null); }
  };

  const create = async () => {
    if (!newVar.key || !newVar.name || !newVar.sqlQuery) { setError('מפתח, שם, ו-SQL הם שדות חובה'); return; }
    setCreating(true);
    try { await aiArchitectureApi.createDataVariable(newVar); await load(); setShowCreate(false); setNewVar({ key: '', name: '', description: '', sqlQuery: 'SELECT ... FROM ... WHERE user_id = @user_id', resultFormat: 'json' }); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'שגיאה'); }
    finally { setCreating(false); }
  };

  return (
    <PageWrap>
      <Title>משתני נתונים (Data Variables)</Title>
      <Desc>
        כל משתנה מגדיר SQL query שמופעל לפני שליחת הפרומפט ל-AI.
        התוצאות מוזרקות לתבנית בצורת <code>{'{{placeholder_key}}'}</code>.
        השתמש ב-<code>@user_id</code> ב-SQL לסינון לפי משתמש.
      </Desc>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <Btn onClick={load} disabled={loading} $secondary><RefreshCw size={15} />רענן</Btn>
        <Btn onClick={() => setShowCreate((v) => !v)}><Plus size={15} />משתנה חדש</Btn>
      </div>

      {showCreate && (
        <CreateForm>
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>משתנה חדש</div>
          <Label>מפתח (key) – ייחודי</Label>
          <Input value={newVar.key} onChange={(e) => setNewVar((p) => ({ ...p, key: e.target.value }))} placeholder="my_variable_key" />
          <Label>שם (תיאורי)</Label>
          <Input value={newVar.name} onChange={(e) => setNewVar((p) => ({ ...p, name: e.target.value }))} />
          <Label>תיאור</Label>
          <Input value={newVar.description} onChange={(e) => setNewVar((p) => ({ ...p, description: e.target.value }))} />
          <Label>SQL Query</Label>
          <TextArea value={newVar.sqlQuery} onChange={(e) => setNewVar((p) => ({ ...p, sqlQuery: e.target.value }))} rows={4} />
          <Label>פורמט תוצאה</Label>
          <Select value={newVar.resultFormat} onChange={(e) => setNewVar((p) => ({ ...p, resultFormat: e.target.value }))}>
            <option value="json">json (מערך שורות)</option>
            <option value="text">text (ערך בודד)</option>
            <option value="number">number (מספר)</option>
          </Select>
          <Row>
            <Btn $secondary onClick={() => setShowCreate(false)}>ביטול</Btn>
            <Btn onClick={create} disabled={creating}>{creating ? 'יוצר...' : 'צור משתנה'}</Btn>
          </Row>
        </CreateForm>
      )}

      {loading && list.length === 0 ? (
        <p style={{ color: '#64748b' }}>טוען...</p>
      ) : list.length === 0 ? (
        <p style={{ color: '#64748b' }}>אין משתנים. צור את הראשון.</p>
      ) : (
        list.map((v) => {
          const isOpen = expandedId === v.id;
          const e = editing[v.id];
          return (
            <Card key={v.id}>
              <CardHeader onClick={() => setExpandedId(isOpen ? null : v.id)}>
                <span>
                  {v.name}
                  <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8rem', marginRight: '0.5rem' }}>{v.key}</span>
                  <Badge $active={v.isActive}>{v.isActive ? 'פעיל' : 'לא פעיל'}</Badge>
                </span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </CardHeader>
              {isOpen && (
                <CardBody>
                  {e ? (
                    <>
                      <Label>שם</Label>
                      <Input value={e.name} onChange={(ev) => setField(v.id, 'name', ev.target.value)} />
                      <Label>תיאור</Label>
                      <Input value={e.description} onChange={(ev) => setField(v.id, 'description', ev.target.value)} />
                      <Label>SQL Query</Label>
                      <TextArea value={e.sqlQuery} onChange={(ev) => setField(v.id, 'sqlQuery', ev.target.value)} rows={5} />
                      <Label>פורמט תוצאה</Label>
                      <Select value={e.resultFormat} onChange={(ev) => setField(v.id, 'resultFormat', ev.target.value)}>
                        <option value="json">json</option>
                        <option value="text">text</option>
                        <option value="number">number</option>
                      </Select>
                      <Label>פעיל</Label>
                      <Select value={e.isActive ? '1' : '0'} onChange={(ev) => setField(v.id, 'isActive', ev.target.value === '1')}>
                        <option value="1">כן</option>
                        <option value="0">לא</option>
                      </Select>
                      <Row>
                        <Btn $danger onClick={() => remove(v.id)} disabled={deleting === v.id}><Trash2 size={14} />מחק</Btn>
                        <Btn $secondary onClick={() => setEditing((p) => { const n = { ...p }; delete n[v.id]; return n; })}>ביטול</Btn>
                        <Btn onClick={() => save(v.id)} disabled={saving === v.id}><Save size={14} />{saving === v.id ? 'שומר...' : 'שמור'}</Btn>
                      </Row>
                    </>
                  ) : (
                    <Row><Btn onClick={() => startEdit(v)}>ערוך</Btn></Row>
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
