import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import axiosClient from '../api/axiosClient';
import { apiErrorMessage } from '../api/aiSettingsApi';

// ---------------------------------------------------------------------------------------------
// Tools 4, 5, 7, 8 (AI requests 8.11): what used to be fixed in code is a setting here.
//  * BehaviourCard: the server's switches and numbers (/api/admin/feature-settings), incl. the test accounts
//    that get prompt drafts before they are published (ai.draft_users).
//  * TextsListsCard: every user-facing text (ui_texts) and the lists the code cleans with (/api/admin/ai-texts).
// ---------------------------------------------------------------------------------------------

interface FeatureSetting {
  key: string;
  kind: string;
  value: string | null;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const SETTING_LABELS: Record<string, string> = {
  'ai.draft_users': 'חשבונות בדיקה שמקבלים את הטיוטות (מספרי משתמש, 0 = אף אחד)',
  'library_build.chat.max_questions': 'בניה עם AI: כמה שאלות לפני בנייה',
  'library_build.chat.no_info': 'בניה עם AI: אין מידע אחרי השאלות (ask = לבקש פרטים, build = לבנות בכל זאת)',
  'library_build.chat.max_items': 'בניה עם AI: מקסימום פריטים בבנייה מהשיחה',
  'library_build.style_learning': 'בניה עם AI: למידת סגנון (on/off)',
  'client_agent.consult_max_questions': 'כרטיס לקוח: כמה שאלות הבהרה לנושא',
  dp_daily_ai_answers: 'עמוד הנתונים: תשובות AI ביום למשתמש',
  'general_agent.daily_turns': 'Today smart: שאלות ביום למשתמש',
  'manage_chat.stage2': 'מרכז הניהול: שינויים דרך הצ\'אט (on/off)',
  'manage_chat.bin_days': 'מרכז הניהול: ימים בסל המחזור',
  'ai.monthly_cost_usd': 'תקרת עלות חודשית ($, 0 = בלי)',
  'ai.cost_alert_pct': 'התראת עלות (%)',
  dp_close_time_stat: 'עמוד הנתונים: זמן סגירה (mean / median)',
};

export function BehaviourCard() {
  const [settings, setSettings] = useState<FeatureSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get<{ settings: FeatureSetting[] }>('/api/admin/feature-settings');
      setSettings(data.settings);
      setValues(Object.fromEntries(data.settings.map((s) => [s.key, s.value ?? ''])));
    } catch (e) {
      setMessage(apiErrorMessage(e, 'טעינת ההגדרות נכשלה'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (key: string) => {
    setMessage(null);
    try {
      await axiosClient.put(`/api/admin/feature-settings/${encodeURIComponent(key)}`, { value: values[key] ?? '' });
      setMessage('נשמר. נכנס לתוקף תוך דקה.');
      await load();
    } catch (e) {
      setMessage(apiErrorMessage(e, 'השמירה נכשלה'));
    }
  };

  return (
    <Card>
      <CardTitle>התנהגות השרת</CardTitle>
      <Muted>מה שהיה קבוע בקוד. כל שינוי נשמר בהיסטוריה.</Muted>
      <Grid>
        {settings.map((s) => (
          <RowLine key={s.key}>
            <span>{SETTING_LABELS[s.key] ?? s.key}<small> · {s.key}</small></span>
            <input dir="ltr" value={values[s.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))} />
            <SmallBtn disabled={(values[s.key] ?? '') === (s.value ?? '')} onClick={() => void save(s.key)}>שמור</SmallBtn>
          </RowLine>
        ))}
      </Grid>
      {message && <Muted>{message}</Muted>}
    </Card>
  );
}

interface UiTextRow { key: string; value: string; description: string | null }
interface ListItem { itemKey: string; label: string; isActive: boolean }
interface EditableList { key: string; description: string; items: ListItem[] }

export function TextsListsCard() {
  const [texts, setTexts] = useState<UiTextRow[]>([]);
  const [lists, setLists] = useState<EditableList[]>([]);
  const [filter, setFilter] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get<{ texts: UiTextRow[]; lists: EditableList[] }>('/api/admin/ai-texts');
      setTexts(data.texts);
      setLists(data.lists);
    } catch (e) {
      setMessage(apiErrorMessage(e, 'טעינת הטקסטים נכשלה'));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMessage(null);
    try {
      await fn();
      setMessage(ok);
      await load();
    } catch (e) {
      setMessage(apiErrorMessage(e, 'הפעולה נכשלה'));
    }
  };

  const shown = texts.filter((t) => !filter || t.key.includes(filter) || t.value.includes(filter)).slice(0, 60);

  return (
    <Card>
      <CardTitle>טקסטים ורשימות</CardTitle>
      <Muted>כל הודעה שהקוד מציג למשתמשים, ורשימות המילים שהקוד מנקה לפיהן. צריך להשאיר את ה-{'{{…}}'} כמו שהם.</Muted>
      {lists.map((l) => (
        <div key={l.key} style={{ marginBottom: '0.75rem' }}>
          <strong>{l.description}</strong> <small>· {l.key}</small>
          <Chips>
            {l.items.map((i) => (
              <Chip key={i.itemKey} $off={!i.isActive}>
                {i.label}
                <button type="button" title={i.isActive ? 'כבה' : 'הדלק'}
                  onClick={() => void act(() => axiosClient.put(`/api/admin/ai-texts/lists/${l.key}/${i.itemKey}`, { label: i.label, isActive: !i.isActive }), 'עודכן')}>
                  {i.isActive ? '⏸' : '▶'}
                </button>
                <button type="button" title="הסר"
                  onClick={() => void act(() => axiosClient.delete(`/api/admin/ai-texts/lists/${l.key}/${i.itemKey}`), 'הוסר')}>✕</button>
              </Chip>
            ))}
            <input placeholder="מילה חדשה" value={newItem[l.key] ?? ''} onChange={(e) => setNewItem((v) => ({ ...v, [l.key]: e.target.value }))} />
            <SmallBtn disabled={!(newItem[l.key] ?? '').trim()}
              onClick={() => void act(async () => {
                await axiosClient.post(`/api/admin/ai-texts/lists/${l.key}`, { label: newItem[l.key], isActive: true });
                setNewItem((v) => ({ ...v, [l.key]: '' }));
              }, 'נוסף')}>הוסף</SmallBtn>
          </Chips>
        </div>
      ))}
      <input placeholder="חיפוש טקסט (מפתח או מילה)" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem' }} />
      {shown.map((t) => (
        <TextRow key={t.key}>
          <small dir="ltr">{t.key}</small>
          <textarea dir="auto" rows={2} value={edits[t.key] ?? t.value} onChange={(e) => setEdits((v) => ({ ...v, [t.key]: e.target.value }))} />
          <SmallBtn disabled={edits[t.key] === undefined || edits[t.key] === t.value}
            onClick={() => void act(async () => {
              await axiosClient.put(`/api/admin/ai-texts/texts/${encodeURIComponent(t.key)}`, { value: edits[t.key] });
              setEdits((v) => { const n = { ...v }; delete n[t.key]; return n; });
            }, 'נשמר')}>שמור</SmallBtn>
        </TextRow>
      ))}
      {texts.length > shown.length && <Muted>מוצגים {shown.length} מתוך {texts.length}. חפש כדי לצמצם.</Muted>}
      {message && <Muted>{message}</Muted>}
    </Card>
  );
}

const Card = styled.section`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
`;
const CardTitle = styled.h2`
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
`;
const Muted = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0.25rem 0 0.5rem;
`;
const Grid = styled.div`
  display: grid;
  gap: 0.4rem;
`;
const RowLine = styled.div`
  display: grid;
  grid-template-columns: 1fr 160px auto;
  gap: 0.5rem;
  align-items: center;
  small { color: #9ca3af; }
  input { padding: 0.3rem 0.5rem; }
`;
const SmallBtn = styled.button`
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
`;
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-top: 0.4rem;
`;
const Chip = styled.span<{ $off: boolean }>`
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: ${(p) => (p.$off ? '#f3f4f6' : '#eef2ff')};
  color: ${(p) => (p.$off ? '#9ca3af' : 'inherit')};
  button { border: none; background: none; cursor: pointer; padding: 0 0.15rem; }
`;
const TextRow = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 0.5rem;
  align-items: start;
  margin-bottom: 0.4rem;
  small { color: #6b7280; word-break: break-all; }
  textarea { width: 100%; font: inherit; }
`;
