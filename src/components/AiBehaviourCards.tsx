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
  'library_build.repeat_min_files': 'בניה עם AI: פריטים שחוזרים יחד בלפחות כמה הצעות מוצעים כקבוצת מוצרים (2)',
  'library_build.repeat_min_items': 'בניה עם AI: כמה פריטים לפחות בקבוצה כזו (2)',
  'library_build.repeat_max_groups': 'בניה עם AI: כמה קבוצות כאלה לכל היותר (3)',
  'client_agent.consult_max_questions': 'כרטיס לקוח: כמה שאלות הבהרה לנושא',
  dp_daily_ai_answers: 'עמוד הנתונים: תשובות AI ביום למשתמש',
  'general_agent.daily_turns': 'Today smart: שאלות ביום למשתמש',
  'manage_chat.stage2': 'מרכז הניהול: שינויים דרך הצ\'אט (on/off)',
  'manage_chat.bin_days': 'מרכז הניהול: ימים בסל המחזור',
  'ai.monthly_cost_usd': 'תקרת עלות חודשית ($, 0 = בלי)',
  'ai.cost_alert_pct': 'התראת עלות (%)',
  'ai.quota_unit': 'מכסת AI סופרת: call = כל קריאה, turn = כל תור בצ\'אט או לחיצה, quote = כל צ\'אט של הצעה',
  dp_close_time_stat: 'עמוד הנתונים: זמן סגירה (mean / median)',
  dp_product_rank_min: 'עמוד הנתונים: דירוג מוצרים, מכמה הצעות שהוחלטו מוצר מדורג',
  dp_series_week_days: 'עמוד הנתונים: גרף ההכנסות וזמן לסגירה — עד כמה ימים בתקופה מציגים נקודה לכל שבוע; מעבר לזה, לכל חודש',
  dp_close_time_max_days: 'עמוד הנתונים: זמן לסגירה — מעל כמה ימים מהשליחה לאישור זו טעות בנתונים, וההצעה לא נספרת',
  urgent_expiring_days_before: 'לטיפול מיידי: כמה ימים לפני סוף התוקף מופיע "התוקף יפוג" (3)',
  'marketing.project_max': 'המסמך השיווקי: כמה תמונות פרויקטים אפשר להעלות (10)',
  'marketing.client_logo_max': 'המסמך השיווקי: כמה לוגואים בשיתופי פעולה אפשר להעלות (8)',
  'ai.refine_windows': 'חלונות הכתיבה: באילו חלונות מופיעה השורה "מה לשנות?" (מפתחות מופרדים בפסיק, למשל improve_note, write_opening_paragraph · ריק = בכולם)',
  urgent_expired_days_after: 'לטיפול מיידי: כמה ימים אחרי סוף התוקף נשאר הכרטיס "התוקף פג!" (7)',
  'ai_options_max.write_quote_title': 'כותרת הצעה: עד כמה גרסאות ה-AI מציע (1–6, ברירת מחדל 4)',
  'ai_options_max.write_section_title': 'כותרת מקטע: עד כמה גרסאות ה-AI מציע (1–6, ברירת מחדל 4)',
  'ai_options_max.write_product_name': 'שם מוצר: עד כמה גרסאות ה-AI מציע (1–6, ברירת מחדל 3)',
  'ai_options_min.write_quote_title': 'כותרת הצעה: פחות גרסאות תקינות מזה = בקשה נוספת ל-AI (1 = כל גרסה תקינה מספיקה)',
  'ai_options_min.write_section_title': 'כותרת מקטע: פחות גרסאות תקינות מזה = בקשה נוספת ל-AI (1 = כל גרסה תקינה מספיקה)',
  'ai_options_min.write_product_name': 'שם מוצר: פחות גרסאות תקינות מזה = בקשה נוספת ל-AI (1 = כל גרסה תקינה מספיקה)',
  wt_tidy_enabled: 'סוגי עבודה: סידור שבועי עם AI (on/off)',
  wt_tidy_day: 'סוגי עבודה: יום הסידור (0 = ראשון … 6 = שבת)',
  wt_tidy_hour: 'סוגי עבודה: שעת הסידור (0–23, שעון ישראל)',
  wt_tidy_max_sections: 'סוגי עבודה: כמה מקטעים בלי סוג נשלחים ל-AI בהרצה',
  ad_principles_max: 'היועץ: כמה עקרונות בתור',
  ad_chip_on: 'היועץ: הכפתור הכתום "מה עושים עם זה?" מוצג (on / off)',
  ad_card_questions_max: 'היועץ: כמה שאלות בכרטיס',
  ad_profile_reuse: 'היועץ: לא לשאול שוב מה שהפרופיל כבר יודע (on / off)',
  ad_is_active: 'היועץ: מתג כללי (on / off)',
  ad_remind_days: 'היועץ: [תזכיר לי] — בעוד כמה ימים התזכורת (1 = מחר)',
  ad_remind_hour: 'היועץ: [תזכיר לי] — באיזו שעה (0–23, שעון ישראל)',
  ad_thumbs_reasons: 'היועץ: הסיבות ל-👎 (מופרדות ב-|)',
  ad_roles: 'היועץ: מי רואה (owner, manager, employee, מופרדים בפסיק)',
  ad_daily_turns: 'היועץ: תקרה יומית של תורות (plan = לפי המסלול, או מספר)',
  ad_cards_per_goal: 'היועץ: כמה כרטיסים בשורה לפני "עוד"',
  ad_react_timeout_ms: 'היועץ: מדלגים על התגובה הקצרה בין שאלות כשהיא איטית מזה (מילישניות)',
  library_build_merge_words: 'בניה עם AI: מילים שהן בקשת איחוד ("אחד כפילויות") — מה שה-AI השמיט מהרשימה נמחק (מופרדות ב-|)',
  data_variables_timeout_ms: 'משתני נתונים: זמן מקסימלי לשאילתה של משתנה (מילישניות, עד 30,000)',
  ad_catalog_options: 'היועץ: כמה כפתורים בשאלה מסוג "סוגי העבודה שלך" או "לפי המקצוע"',
  ad_referral_sources: 'היועץ: מילים במקור הליד שנחשבות "המלצה" (כרטיס המספרים)',
  ad_warm_sources: 'היועץ: מילים במקור הליד שנחשבות "חם"; כל השאר "קר" (כרטיס המספרים)',
  ad_what_now_max_options: 'היועץ: כמה תשובות לכל היותר בשאלה של "מה עושים עם זה?"',
  ad_handoff_confidence: 'היועץ: כמה בטוח (אחוז) הנתב של Today smart צריך להיות כדי לעבור ישר ליועץ; מתחת לזה המסך שואל קודם',
  ad_card_resume_days: 'היועץ: כמה ימים ממשיכים שיחה של כרטיס',
  ad_answer_max_lines: 'היועץ: אורך תשובה בכרטיס ובכפתור (שורות)',
  ad_chat_max_questions: 'היועץ: כמה שאלות ברצף בשיחה',
  ad_chat_opening_on: 'היועץ: הפתיחה עם 4 הכפתורים (on / off)',
  ad_chat_metrics_max: 'היועץ: כמה מדדים בתור בשיחה',
  ad_chat_max_lines: 'היועץ: אורך תשובה בשיחה (שורות)',
  ad_default_kb_by_goal: 'היועץ: עיקרון הגיבוי לכל מטרה (מטרה:kb_…, מופרד בפסיק)',
  ad_profile_stale_days: 'היועץ: אחרי כמה ימים שואלים "עדיין נכון?"',
  ad_forbidden_words: 'היועץ: מילים שהיועץ לא כותב (מופרדות בפסיק)',
  advisor_event_keep_days: 'היועץ: כמה ימים נשמר יומן הפעולות',
  'plan.default_close_rate': 'התוכנית שלי: אחוז סגירה להערכה (%), עד שלעסק יש נתונים משלו',
  'plan.price_mids': 'התוכנית שלי: המחיר הטיפוסי לכל תשובה של "כמה עולה עבודה טיפוסית" (מפתח:₪)',
  'plan.behind_min': 'התוכנית שלי: מכמה ₪ מתחת לקצב מראים "בפיגור"',
  'plan.status_gap_abs': 'התוכנית שלי: עד כמה ₪ מתחת לקצב עדיין "קרוב"',
  'plan.status_gap_pct': 'התוכנית שלי: עד כמה % מהיעד מתחת לקצב עדיין "קרוב"',
  'plan.axis_min_gap': 'התוכנית שלי: פער (%) בין סוג העבודה הטוב לחלש שממנו "איך חישבנו" מציין את הציר',
  'plan.stale_gate': 'התוכנית שלי: מעל כמה הצעות שפג תוקפן מציגים קודם את מסך הסידור',
  'plan.stale_open_days': 'התוכנית שלי: כמה ימים הצעה שסומנה "עדיין פתוחה" לא חוזרת לרשימה',
  'plan.is_active': 'התוכנית שלי: מתג כללי (כבוי = הכרטיס לא מופיע)',
  'plan.goal_multipliers': 'התוכנית שלי: סכומי היעד בשאלה 2 = מה שאושר בתקופה הקודמת × המכפילים (שלושה, עולים)',
  'plan.goal_round': 'התוכנית שלי: עיגול סכומי היעד (₪)',
  'plan.goal_recommended': 'התוכנית שלי: איזה סכום יעד מסומן "מומלץ" (1–3)',
  'plan.new_goal_amounts': 'התוכנית שלי: סכומי היעד לעסק בלי נתונים, לחודש (×3 לרבעון, ×12 לשנה)',
  'plan.ai_timeout_ms': 'התוכנית שלי: כמה זמן מותר לשיחה עם היועץ או לקריאת הצעות מהעבר (מילישניות)',
  'plan.import_max_files': 'התוכנית שלי: כמה הצעות מהעבר אפשר להעלות בפעם אחת',
  'plan.import_max_mb': 'התוכנית שלי: גודל מרבי לקובץ (MB)',
  'plan.import_types': 'התוכנית שלי: סוגי הקבצים שאפשר להעלות (pdf, jpg, png...)',
  'plan.import_likes_max': 'התוכנית שלי: כמה סוגי עבודה מחזירים לשאלה 5 מההעלאה',
  'plan.price_edges': 'התוכנית שלי: איפה נגמר כל טווח מחיר (₪), להעלאת הצעות מהעבר',
  expert_review_max_points: 'שאל את המומחה: כמה נקודות לשיפור בבדיקה',
  expert_review_max_questions: 'שאל את המומחה: כמה שאלות מוצעות בבדיקה',
  expert_ask_min_sentences: 'שאל את המומחה: מינימום משפטים בתשובה',
  expert_ask_max_sentences: 'שאל את המומחה: מקסימום משפטים בתשובה',
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
  // C16: a text or a list that does not exist yet (the site already looks for some keys, e.g. support.whatsapp_phone).
  const [newText, setNewText] = useState({ key: '', value: '', description: '' });
  const [newList, setNewList] = useState({ key: '', description: '' });
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
      <AddBox>
        <strong>רשימה חדשה</strong>
        <input dir="ltr" placeholder="מפתח (למשל personal_text_examples)" value={newList.key}
          onChange={(e) => setNewList((v) => ({ ...v, key: e.target.value }))} />
        <input placeholder="תיאור (מה הרשימה עושה)" value={newList.description}
          onChange={(e) => setNewList((v) => ({ ...v, description: e.target.value }))} />
        <SmallBtn disabled={!newList.key.trim()}
          onClick={() => void act(async () => {
            await axiosClient.post('/api/admin/ai-texts/lists', { listKey: newList.key.trim(), description: newList.description });
            setNewList({ key: '', description: '' });
          }, 'הרשימה נוספה. עכשיו אפשר להוסיף לה מילים')}>הוסף רשימה</SmallBtn>
      </AddBox>
      <AddBox>
        <strong>הוסף טקסט</strong>
        <input dir="ltr" placeholder="מפתח (למשל support.whatsapp_phone)" value={newText.key}
          onChange={(e) => setNewText((v) => ({ ...v, key: e.target.value }))} />
        <input dir="auto" placeholder="ערך (ריק = לא מוגדר)" value={newText.value}
          onChange={(e) => setNewText((v) => ({ ...v, value: e.target.value }))} />
        <input placeholder="תיאור (איפה הטקסט מופיע)" value={newText.description}
          onChange={(e) => setNewText((v) => ({ ...v, description: e.target.value }))} />
        <SmallBtn disabled={!newText.key.trim()}
          onClick={() => void act(async () => {
            await axiosClient.post('/api/admin/ai-texts/texts', { key: newText.key.trim(), value: newText.value, description: newText.description });
            setFilter(newText.key.trim());
            setNewText({ key: '', value: '', description: '' });
          }, 'הטקסט נוסף')}>הוסף טקסט</SmallBtn>
      </AddBox>
      <Muted>ערך ריק נשמר כ"לא מוגדר", והאתר מסתיר את מה שתלוי בו (למשל כפתור הוואטסאפ לצוות).</Muted>
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
const AddBox = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr 1fr 1fr auto;
  gap: 0.5rem;
  align-items: center;
  margin: 0.5rem 0;
  input { padding: 0.3rem 0.5rem; min-width: 0; }
  @media (max-width: 720px) { grid-template-columns: 1fr; }
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
