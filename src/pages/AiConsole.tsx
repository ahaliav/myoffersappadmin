import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Bot,
  Activity,
  BarChart3,
  Users as UsersIcon,
  CreditCard,
  FileText,
  Sparkles,
  History,
  DollarSign,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';

const Page = styled.div`
  max-width: 1100px;
`;

const Header = styled.div`
  margin-bottom: 1.25rem;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  margin: 0 0 0.25rem 0;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #64748b;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
`;

const Card = styled(Link)<{ $primary?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: ${({ $primary }) =>
    $primary ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'white'};
  color: ${({ $primary }) => ($primary ? 'white' : 'inherit')};
  border: 1px solid ${({ $primary }) => ($primary ? 'transparent' : '#e2e8f0')};
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  }
`;

const CardIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
`;

const CardDesc = styled.div`
  font-size: 0.85rem;
  opacity: 0.85;
  line-height: 1.45;
`;

const Hint = styled.div`
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 10px;
  font-size: 0.85rem;
`;

interface Tile {
  to: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  primary?: boolean;
  external?: boolean;
}

const TILES: Tile[] = [
  {
    to: '/ai-console/chat',
    title: 'AI Chat',
    desc: 'שאל בשפה חופשית — ה-AI יבחר אילו כלים להריץ ויאסוף את התשובה',
    icon: <Bot size={22} />,
    primary: true,
  },
  // The following tiles are placeholders that link to the existing screens
  // or to the AI Chat (which can answer them via tools). Future dedicated
  // dashboards can replace these links.
  { to: '/ai-console/chat?q=Show%20me%20AI%20token%20usage%20last%207%20days',
    title: 'AI Usage Analytics', desc: 'שימוש בטוקנים לפי משתמש / פעולה / חבילה',
    icon: <Activity size={22} /> },
  { to: '/ai-console/chat?q=What%20is%20the%20AI%20failure%20rate%20this%20week',
    title: 'AI Monitoring', desc: 'אחוזי כשל, חוסר זמינות, אזהרות AI',
    icon: <AlertTriangle size={22} /> },
  { to: '/ai-console/chat?q=Who%20are%20the%20top%20paying%20users',
    title: 'User Insights', desc: 'משתמשים מובילים, פעילים, בסיכון נטישה',
    icon: <UsersIcon size={22} /> },
  { to: '/ai-console/chat?q=Show%20me%20revenue%20by%20plan',
    title: 'Revenue Insights', desc: 'הכנסה לפי חבילה / קטגוריה / תקופה',
    icon: <BarChart3 size={22} /> },
  { to: '/logs',
    title: 'Logs Explorer', desc: 'לוגים מהמערכת — חיפוש לפי רמה / טקסט / תאריך',
    icon: <FileText size={22} /> },
  { to: '/ai-console/chat?q=Give%20me%20a%20subscription%20summary',
    title: 'Subscription Intelligence', desc: 'מנויים פעילים, מסתיימים בקרוב, churn risk',
    icon: <CreditCard size={22} /> },
  { to: '/prompts',
    title: 'Prompt Management', desc: 'ניהול הפרומפטים שמפעילים את ה-AI',
    icon: <Sparkles size={22} /> },
  { to: '/ai-console/chat?q=Show%20me%20the%20most%20used%20AI%20tools%20today',
    title: 'Tool Execution History', desc: 'כל הקריאות לכלים — הצלחות / כשלים / זמני ריצה',
    icon: <History size={22} /> },
  { to: '/ai-console/chat?q=Estimate%20our%20AI%20cost%20this%20month',
    title: 'AI Cost Dashboard', desc: 'הערכת עלויות OpenAI לפי תקופה',
    icon: <DollarSign size={22} /> },
  { to: '/ai-console/chat?q=Which%20AI%20operations%20fail%20the%20most',
    title: 'AI Failure Dashboard', desc: 'פעולות AI נכשלות, סיבות, מגמות',
    icon: <TrendingDown size={22} /> },
];

export default function AiConsole() {
  return (
    <Page>
      <Header>
        <Title>AI Admin Console</Title>
        <Subtitle>
          שכבת AI דינמית מעל המערכת — שאל כל שאלה בשפה חופשית, או צלול לדשבורד ייעודי.
        </Subtitle>
      </Header>
      <Grid>
        {TILES.map((t) => (
          <Card key={t.to + t.title} to={t.to} $primary={t.primary}>
            <CardIcon>
              {t.icon}
              {t.title}
            </CardIcon>
            <CardDesc>{t.desc}</CardDesc>
          </Card>
        ))}
      </Grid>
      <Hint>
        💡 רוב הדשבורדים שלעיל הם קישורים ל-AI Chat עם שאלה מוכנה. ה-AI מחליט אילו כלים להפעיל
        — ומכאן הוא יחזיר את אותם נתונים שהיו מופיעים בדשבורד ייעודי.
      </Hint>
    </Page>
  );
}
