import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, type PlanDto, type CreatePlanRequest } from '../api/adminApi';
import { RefreshCw, Plus, Save, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

const Btn = styled.button<{ $secondary?: boolean; $danger?: boolean }>`
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ $secondary, $danger }) =>
    $danger ? '#dc2626' : $secondary ? '#f1f5f9' : '#3b82f6'};
  color: ${({ $secondary, $danger }) => ($danger ? 'white' : $secondary ? '#334155' : 'white')};
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: ${({ $secondary, $danger }) =>
      $danger ? '#b91c1c' : $secondary ? '#e2e8f0' : '#2563eb'};
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
  min-height: 80px;
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

const FlexRow = styled.div`
  display: flex;
  flex-direction: row-reverse;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

function norm(row: Record<string, unknown>): PlanDto {
  return {
    id: (row.id ?? row.Id ?? 0) as number,
    name: (row.name ?? row.Name ?? '') as string,
    code: (row.code ?? row.Code ?? '') as string,
    description: (row.description ?? row.Description ?? null) as string | null,
    price: (row.price ?? row.Price ?? 0) as number,
    currency: (row.currency ?? row.Currency ?? 'ILS') as string,
    billingPeriod: (row.billingPeriod ?? row.BillingPeriod ?? '') as string,
    trialDays: (row.trialDays ?? row.TrialDays ?? null) as number | null,
    isActive: (row.isActive ?? row.IsActive ?? true) as boolean,
    displayOrder: (row.displayOrder ?? row.DisplayOrder ?? 0) as number,
    features: (row.features ?? row.Features ?? null) as string | null,
    aiMonthlyRequestLimit: (row.aiMonthlyRequestLimit ?? row.AiMonthlyRequestLimit ?? null) as number | null,
    aiMonthlyTokenLimit: (row.aiMonthlyTokenLimit ?? row.AiMonthlyTokenLimit ?? null) as number | null,
    createdAt: (row.createdAt ?? row.CreatedAt ?? '') as string,
    updatedAt: (row.updatedAt ?? row.UpdatedAt ?? '') as string,
  };
}

const emptyForm: CreatePlanRequest = {
  name: '',
  code: '',
  description: '',
  price: 0,
  currency: 'ILS',
  billingPeriod: 'month',
  trialDays: null,
  isActive: true,
  displayOrder: 0,
  features: '',
  aiMonthlyRequestLimit: null,
  aiMonthlyTokenLimit: null,
};

export default function Plans() {
  const { session } = useAuth();
  const [list, setList] = useState<PlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<CreatePlanRequest>(emptyForm);
  const [savingAdd, setSavingAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Record<number, CreatePlanRequest>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPlans();
      const data = Array.isArray(res.data) ? res.data : [];
      setList(data.map((x) => norm(x as unknown as Record<string, unknown>)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת החבילות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) load();
  }, [session]);

  const setAddField = (field: keyof CreatePlanRequest, value: string | number | boolean | null) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!addForm.name.trim() || !addForm.code.trim()) {
      setError('שם וקוד חובה');
      return;
    }
    setSavingAdd(true);
    setError(null);
    try {
      await adminApi.createPlan({
        ...addForm,
        price: Number(addForm.price) || 0,
        displayOrder: Number(addForm.displayOrder) || 0,
        trialDays: addForm.trialDays != null && String(addForm.trialDays).trim() !== '' ? Number(addForm.trialDays) : null,
        aiMonthlyRequestLimit:
          addForm.aiMonthlyRequestLimit != null && !Number.isNaN(Number(addForm.aiMonthlyRequestLimit))
            ? Number(addForm.aiMonthlyRequestLimit)
            : null,
        aiMonthlyTokenLimit:
          addForm.aiMonthlyTokenLimit != null && !Number.isNaN(Number(addForm.aiMonthlyTokenLimit))
            ? Number(addForm.aiMonthlyTokenLimit)
            : null,
      });
      await load();
      setAddForm(emptyForm);
      setShowAdd(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת חבילה');
    } finally {
      setSavingAdd(false);
    }
  };

  const startEdit = (p: PlanDto) => {
    setExpandedId(p.id);
    setEditing((prev) => ({
      ...prev,
      [p.id]: {
        name: p.name,
        code: p.code,
        description: p.description ?? '',
        price: p.price,
        currency: p.currency,
        billingPeriod: p.billingPeriod,
        trialDays: p.trialDays,
        isActive: p.isActive,
        displayOrder: p.displayOrder,
        features: p.features ?? '',
        aiMonthlyRequestLimit: p.aiMonthlyRequestLimit ?? null,
        aiMonthlyTokenLimit: p.aiMonthlyTokenLimit ?? null,
      },
    }));
  };

  const setEditField = (id: number, field: keyof CreatePlanRequest, value: string | number | boolean | null) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveEdit = async (id: number) => {
    const form = editing[id];
    if (!form || !form.name?.trim() || !form.code?.trim()) return;
    setSavingId(id);
    setError(null);
    try {
      await adminApi.updatePlan(id, {
        ...form,
        price: Number(form.price) || 0,
        displayOrder: Number(form.displayOrder) || 0,
        trialDays: form.trialDays != null && String(form.trialDays).trim() !== '' ? Number(form.trialDays) : null,
        aiMonthlyRequestLimit:
          form.aiMonthlyRequestLimit != null && !Number.isNaN(Number(form.aiMonthlyRequestLimit))
            ? Number(form.aiMonthlyRequestLimit)
            : null,
        aiMonthlyTokenLimit:
          form.aiMonthlyTokenLimit != null && !Number.isNaN(Number(form.aiMonthlyTokenLimit))
            ? Number(form.aiMonthlyTokenLimit)
            : null,
      });
      await load();
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setExpandedId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בעדכון חבילה');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('למחוק את החבילה?')) return;
    setDeletingId(id);
    setError(null);
    try {
      await adminApi.deletePlan(id);
      await load();
      setExpandedId((prev) => (prev === id ? null : prev));
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה במחיקת חבילה');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && list.length === 0) {
    return (
      <PageWrap>
        <Title>חבילות</Title>
        <p style={{ color: '#64748b' }}>טוען...</p>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <Title>חבילות</Title>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        ניהול תוכניות מנוי — הוספה, עריכה ומחיקה.
      </p>
      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      <FlexRow style={{ marginBottom: '1rem', gap: '0.75rem' }}>
        <Btn onClick={load} disabled={loading} $secondary>
          <RefreshCw size={16} />
          רענן
        </Btn>
        <Btn onClick={() => setShowAdd((v) => !v)} $secondary>
          <Plus size={16} />
          {showAdd ? 'ביטול' : 'הוסף חבילה'}
        </Btn>
      </FlexRow>

      {showAdd && (
        <Card>
          <CardHeader as="div" style={{ cursor: 'default' }}>
            חבילה חדשה
          </CardHeader>
          <CardBody>
            <div>
              <Label>שם (תצוגה)</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddField('name', e.target.value)}
                placeholder="למשל: מנוי חודשי"
              />
            </div>
            <div>
              <Label>קוד (מזהה באנגלית)</Label>
              <Input
                value={addForm.code}
                onChange={(e) => setAddField('code', e.target.value)}
                placeholder="monthly"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <TextArea
                value={addForm.description ?? ''}
                onChange={(e) => setAddField('description', e.target.value)}
                placeholder="אופציונלי"
              />
            </div>
            <FlexRow style={{ gap: '1rem' }}>
              <div style={{ flex: '1 1 120px' }}>
                <Label>מחיר</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={addForm.price}
                  onChange={(e) => setAddField('price', e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <Label>מטבע</Label>
                <Input
                  value={addForm.currency}
                  onChange={(e) => setAddField('currency', e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <Label>תקופת חיוב</Label>
                <Input
                  value={addForm.billingPeriod}
                  onChange={(e) => setAddField('billingPeriod', e.target.value)}
                  placeholder="month / year / trial"
                />
              </div>
              <div style={{ flex: '1 1 80px' }}>
                <Label>ימי ניסיון</Label>
                <Input
                  type="number"
                  min={0}
                  value={addForm.trialDays ?? ''}
                  onChange={(e) => setAddField('trialDays', e.target.value === '' ? null : e.target.value)}
                  placeholder="—"
                />
              </div>
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: '1rem' }}>
                <Label style={{ marginBottom: 0, marginLeft: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={addForm.isActive}
                    onChange={(e) => setAddField('isActive', e.target.checked)}
                  />
                  {' '}פעיל
                </Label>
              </div>
              <div style={{ flex: '0 0 80px' }}>
                <Label>סדר תצוגה</Label>
                <Input
                  type="number"
                  min={0}
                  value={addForm.displayOrder}
                  onChange={(e) => setAddField('displayOrder', parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </FlexRow>
            <div>
              <Label>תכונות (JSON או טקסט)</Label>
              <TextArea
                value={addForm.features ?? ''}
                onChange={(e) => setAddField('features', e.target.value)}
                placeholder='["תכונה 1", "תכונה 2"]'
              />
            </div>
            <FlexRow style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px' }}>
                <Label>מכסת בקשות AI לחודש (ריק = ברירת מחדל)</Label>
                <Input
                  type="number"
                  min={0}
                  value={addForm.aiMonthlyRequestLimit ?? ''}
                  onChange={(e) =>
                    setAddField(
                      'aiMonthlyRequestLimit',
                      e.target.value === '' ? null : parseInt(e.target.value, 10)
                    )
                  }
                  placeholder="למשל 100"
                />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <Label>מכסת טוקנים AI לחודש (ריק = ברירת מחדל, 0 = ללא תקרה)</Label>
                <Input
                  type="number"
                  min={0}
                  value={addForm.aiMonthlyTokenLimit ?? ''}
                  onChange={(e) =>
                    setAddField(
                      'aiMonthlyTokenLimit',
                      e.target.value === '' ? null : parseInt(e.target.value, 10)
                    )
                  }
                  placeholder="0 = ללא תקרה"
                />
              </div>
            </FlexRow>
            <FlexRow>
              <Btn onClick={handleCreate} disabled={savingAdd}>
                <Save size={16} />
                {savingAdd ? 'שומר...' : 'צור חבילה'}
              </Btn>
              <Btn $secondary onClick={() => { setShowAdd(false); setAddForm(emptyForm); }}>
                ביטול
              </Btn>
            </FlexRow>
          </CardBody>
        </Card>
      )}

      {list.length === 0 ? (
        <p style={{ color: '#64748b' }}>אין חבילות. הוסף חבילה חדשה.</p>
      ) : (
        list.map((plan) => {
          const isOpen = expandedId === plan.id;
          const form = editing[plan.id];
          return (
            <Card key={plan.id}>
              <CardHeader onClick={() => setExpandedId(isOpen ? null : plan.id)}>
                <span>
                  {plan.name}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '0.5rem' }}>
                    {plan.code} · ₪{plan.price} · {plan.billingPeriod}
                    {plan.isActive ? '' : ' · לא פעיל'}
                  </span>
                </span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </CardHeader>
              {isOpen && (
                <CardBody>
                  {form ? (
                    <>
                      <div>
                        <Label>שם</Label>
                        <Input
                          value={form.name}
                          onChange={(e) => setEditField(plan.id, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>קוד</Label>
                        <Input
                          value={form.code}
                          onChange={(e) => setEditField(plan.id, 'code', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>תיאור</Label>
                        <TextArea
                          value={form.description ?? ''}
                          onChange={(e) => setEditField(plan.id, 'description', e.target.value)}
                        />
                      </div>
                      <FlexRow style={{ gap: '1rem' }}>
                        <div style={{ flex: '1 1 120px' }}>
                          <Label>מחיר</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.price}
                            onChange={(e) => setEditField(plan.id, 'price', e.target.value)}
                          />
                        </div>
                        <div style={{ flex: '1 1 100px' }}>
                          <Label>מטבע</Label>
                          <Input
                            value={form.currency}
                            onChange={(e) => setEditField(plan.id, 'currency', e.target.value)}
                          />
                        </div>
                        <div style={{ flex: '1 1 120px' }}>
                          <Label>תקופת חיוב</Label>
                          <Input
                            value={form.billingPeriod}
                            onChange={(e) => setEditField(plan.id, 'billingPeriod', e.target.value)}
                          />
                        </div>
                        <div style={{ flex: '1 1 80px' }}>
                          <Label>ימי ניסיון</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.trialDays ?? ''}
                            onChange={(e) =>
                              setEditField(
                                plan.id,
                                'trialDays',
                                e.target.value === '' ? null : e.target.value
                              )
                            }
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1rem' }}>
                          <Label style={{ marginBottom: 0, marginRight: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={form.isActive}
                              onChange={(e) => setEditField(plan.id, 'isActive', e.target.checked)}
                            />
                            {' '}פעיל
                          </Label>
                        </div>
                        <div style={{ flex: '0 0 80px' }}>
                          <Label>סדר תצוגה</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.displayOrder}
                            onChange={(e) =>
                              setEditField(plan.id, 'displayOrder', parseInt(e.target.value, 10) || 0)
                            }
                          />
                        </div>
                      </FlexRow>
                      <div>
                        <Label>תכונות</Label>
                        <TextArea
                          value={form.features ?? ''}
                          onChange={(e) => setEditField(plan.id, 'features', e.target.value)}
                        />
                      </div>
                      <FlexRow style={{ gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 160px' }}>
                          <Label>מכסת בקשות AI לחודש (ריק = ברירת מחדל)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.aiMonthlyRequestLimit ?? ''}
                            onChange={(e) =>
                              setEditField(
                                plan.id,
                                'aiMonthlyRequestLimit',
                                e.target.value === '' ? null : parseInt(e.target.value, 10)
                              )
                            }
                          />
                        </div>
                        <div style={{ flex: '1 1 160px' }}>
                          <Label>מכסת טוקנים (0 = ללא תקרה)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.aiMonthlyTokenLimit ?? ''}
                            onChange={(e) =>
                              setEditField(
                                plan.id,
                                'aiMonthlyTokenLimit',
                                e.target.value === '' ? null : parseInt(e.target.value, 10)
                              )
                            }
                          />
                        </div>
                      </FlexRow>
                      <FlexRow>
                        <Btn onClick={() => saveEdit(plan.id)} disabled={savingId === plan.id}>
                          <Save size={16} />
                          {savingId === plan.id ? 'שומר...' : 'שמור'}
                        </Btn>
                        <Btn
                          $danger
                          onClick={() => handleDelete(plan.id)}
                          disabled={deletingId === plan.id}
                        >
                          <Trash2 size={16} />
                          {deletingId === plan.id ? 'מוחק...' : 'מחק'}
                        </Btn>
                        <Btn
                          $secondary
                          onClick={() => {
                            setEditing((prev) => {
                              const next = { ...prev };
                              delete next[plan.id];
                              return next;
                            });
                            setExpandedId(null);
                          }}
                        >
                          ביטול
                        </Btn>
                      </FlexRow>
                    </>
                  ) : (
                    <FlexRow>
                      <Btn onClick={() => startEdit(plan)}>
                        <Pencil size={16} />
                        ערוך
                      </Btn>
                      <Btn
                        $danger
                        onClick={() => handleDelete(plan.id)}
                        disabled={deletingId === plan.id}
                      >
                        <Trash2 size={16} />
                        מחק
                      </Btn>
                    </FlexRow>
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
