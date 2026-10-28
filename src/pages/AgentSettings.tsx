import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Save } from 'lucide-react';
import { agentSettingsApi, type AgentSettings as Data } from '../api/agentSettingsApi';

const PageWrap = styled.div`direction: rtl; text-align: right;`;
const Title = styled.h1`margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: #0f172a;`;
const Desc = styled.p`color: #64748b; margin: 0 0 1.25rem; font-size: 0.875rem; line-height: 1.6;`;
const Tabs = styled.div`display: flex; gap: 0.4rem; margin-bottom: 1rem;`;
const Tab = styled.button<{ $on: boolean }>`
  padding: 0.45rem 0.9rem; border-radius: 8px; border: 1px solid ${({ $on }) => ($on ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $on }) => ($on ? '#eff6ff' : '#fff')}; color: ${({ $on }) => ($on ? '#1d4ed8' : '#334155')}; cursor: pointer; font-size: 0.875rem;
`;
const Card = styled.div`background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; margin-bottom: 0.5rem;`;
const Row = styled.div`display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;`;
const Key = styled.code`font-size: 0.8rem; color: #0f172a; min-width: 260px;`;
const Muted = styled.span`color: #64748b; font-size: 0.8rem;`;
const Input = styled.input`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; min-width: 120px;`;
const Area = styled.textarea`padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; flex: 1; min-width: 280px; font-family: inherit;`;
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; background: #3b82f6; color: #fff; border: none;
  border-radius: 8px; font-size: 0.85rem; cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.875rem;`;

type TabKey = 'numbers' | 'texts' | 'lists' | 'history';

const LIST_NAMES: Record<string, string> = {
  client_agent_topics: 'נושאי הודעה (הנחיה לכל נושא)',
  client_agent_intents: 'כוונות הנתב (תיאור · דוגמאות)',
  client_agent_types: 'סוגי לקוח',
};

/**
 * E12 "הגדרות הסוכן": every number, text and list of the customer agent. Saving one applies at once (no deploy) and is kept in
 * the history. The prompts themselves are edited in "כתיבה עם AI" (family client_agent).
 */
export default function AgentSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<TabKey>('numbers');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => agentSettingsApi.get().then(setData).catch(() => setError('לא הצלחתי לטעון'));
  useEffect(() => { void load(); }, []);

  const save = async (id: string, run: () => Promise<unknown>) => {
    setSaving(id);
    setError(null);
    try {
      await run();
      setDrafts((d) => { const next = { ...d }; delete next[id]; return next; });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'השמירה נכשלה');
    } finally {
      setSaving(null);
    }
  };

  if (!data) return <PageWrap><Title>הגדרות הסוכן</Title>{error && <ErrorText>{error}</ErrorText>}</PageWrap>;

  return (
    <PageWrap>
      <Title>הגדרות הסוכן (כרטיס לקוח)</Title>
      <Desc>
        כל מספר, טקסט ורשימה של הסוכן. שמירה חלה מיד, בלי פריסה, ונשמרת בהיסטוריה. את הפרומפטים עורכים ב"כתיבה עם AI" (client_agent).
      </Desc>
      <Tabs>
        <Tab $on={tab === 'numbers'} onClick={() => setTab('numbers')}>מספרים ומתגים ({data.settings.length})</Tab>
        <Tab $on={tab === 'texts'} onClick={() => setTab('texts')}>טקסטים ({data.texts.length})</Tab>
        <Tab $on={tab === 'lists'} onClick={() => setTab('lists')}>טבלאות ({data.lists.length})</Tab>
        <Tab $on={tab === 'history'} onClick={() => setTab('history')}>היסטוריה</Tab>
      </Tabs>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      {tab === 'numbers' && data.settings.map((s) => {
        const id = 's:' + s.key;
        const value = drafts[id] ?? s.value;
        return (
          <Card key={s.key}>
            <Row>
              <Key>{s.key}</Key>
              <Input aria-label={s.key} value={value} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} />
              <Btn type="button" disabled={value === s.value || saving === id} onClick={() => void save(id, () => agentSettingsApi.setSetting(s.key, value))}>
                <Save size={14} /> שמור
              </Btn>
            </Row>
            {s.description && <Muted>{s.description}</Muted>}
          </Card>
        );
      })}

      {tab === 'texts' && data.texts.map((t) => {
        const id = 't:' + t.key;
        const value = drafts[id] ?? t.value;
        return (
          <Card key={t.key}>
            <Row>
              <Key>{t.key}</Key>
              <Area aria-label={t.key} rows={2} value={value} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} />
              <Btn type="button" disabled={value === t.value || saving === id} onClick={() => void save(id, () => agentSettingsApi.setText(t.key, value))}>
                <Save size={14} /> שמור
              </Btn>
            </Row>
            {t.description && <Muted>{t.description}</Muted>}
          </Card>
        );
      })}

      {tab === 'lists' && Object.keys(LIST_NAMES).map((listKey) => (
        <div key={listKey}>
          <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '1rem' }}>{LIST_NAMES[listKey]}</h3>
          {data.lists.filter((l) => l.listKey === listKey).map((l) => {
            const id = `l:${l.listKey}.${l.itemKey}`;
            const value = drafts[id] ?? l.label;
            return (
              <Card key={id}>
                <Row>
                  <Key>{l.itemKey}</Key>
                  <Area aria-label={id} rows={1} value={value} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} />
                  <label><input type="checkbox" checked={l.isActive} onChange={(e) => void save(id, () => agentSettingsApi.setListItem(l.listKey, l.itemKey, value, e.target.checked))} /> פעיל</label>
                  <Btn type="button" disabled={value === l.label || saving === id} onClick={() => void save(id, () => agentSettingsApi.setListItem(l.listKey, l.itemKey, value, l.isActive))}>
                    <Save size={14} /> שמור
                  </Btn>
                </Row>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'history' && data.history.map((h) => (
        <Card key={h.key + h.changedAt}>
          <Row><Key>{h.key}</Key><span>{h.value}</span><Muted>{new Date(h.changedAt).toLocaleString('he-IL')} · {h.changedBy ?? '—'}</Muted></Row>
        </Card>
      ))}
    </PageWrap>
  );
}
