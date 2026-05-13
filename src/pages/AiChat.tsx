import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Send, Bot, User as UserIcon, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  aiAdminApi,
  type AdminChatMessage,
  type AdminChatToolCallTrace,
} from '../api/aiAdminApi';

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: AdminChatToolCallTrace[];
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 3rem);
  max-width: 900px;
  width: 100%;
`;

const Banner = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #eef2ff, #f0f9ff);
  border: 1px solid #c7d2fe;
  color: #3730a3;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
`;

const Suggestions = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`;

const SuggestChip = styled.button`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  &:hover { background: #f1f5f9; }
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
`;

const Row = styled.div<{ $role: 'user' | 'assistant' }>`
  display: flex;
  gap: 0.5rem;
  flex-direction: ${({ $role }) => ($role === 'user' ? 'row-reverse' : 'row')};
  align-items: flex-start;
`;

const Avatar = styled.div<{ $role: 'user' | 'assistant' }>`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: ${({ $role }) => ($role === 'user' ? '#3b82f6' : '#e0e7ff')};
  color: ${({ $role }) => ($role === 'user' ? 'white' : '#3730a3')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Bubble = styled.div<{ $role: 'user' | 'assistant' }>`
  background: ${({ $role }) => ($role === 'user' ? '#3b82f6' : 'white')};
  color: ${({ $role }) => ($role === 'user' ? 'white' : '#0f172a')};
  border: 1px solid ${({ $role }) => ($role === 'user' ? 'transparent' : '#e2e8f0')};
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
  font-size: 0.95rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 80%;
`;

const Composer = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
`;

const Input = styled.textarea`
  flex: 1;
  resize: none;
  border: 1px solid #cbd5e1;
  border-radius: 22px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  font-family: inherit;
  background: white;
  min-height: 44px;
  max-height: 140px;
  &:focus { outline: none; border-color: #6366f1; }
`;

const SendBtn = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ToolsLine = styled.div`
  margin-top: 0.4rem;
  font-size: 0.75rem;
  color: #64748b;
`;

const ToolsToggle = styled.button`
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const ToolsList = styled.div`
  margin-top: 0.3rem;
  border-left: 2px solid #e2e8f0;
  padding: 0.4rem 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  color: #475569;
  background: #f8fafc;
  border-radius: 6px;
`;

const SUGGESTIONS = [
  'Show me the AI failure rate this week',
  'Who are the top paying users?',
  'Estimate our AI cost this month',
  'Show me yesterday\'s exceptions',
  'Which subscription plan generates most revenue?',
  'Which users are close to their AI quota?',
];

function ToolCallsBlock({ calls }: { calls: AdminChatToolCallTrace[] }) {
  const [open, setOpen] = useState(false);
  if (!calls || calls.length === 0) return null;
  return (
    <ToolsLine>
      <ToolsToggle type="button" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {calls.length} tool call{calls.length === 1 ? '' : 's'}
      </ToolsToggle>
      {open && (
        <ToolsList>
          {calls.map((c, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <strong>{c.name}</strong>({c.arguments})
              <div style={{ opacity: 0.8 }}>→ {c.resultPreview}</div>
            </div>
          ))}
        </ToolsList>
      )}
    </ToolsLine>
  );
}

export default function AiChat() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q');
  const sentInitialRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Auto-fire if the URL had ?q=...
  useEffect(() => {
    if (initialQ && !sentInitialRef.current) {
      sentInitialRef.current = true;
      // Strip from URL after capturing so refresh doesn't re-fire
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      setSearchParams(next, { replace: true });
      send(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    setInput('');

    const next: UiMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);

    const payload: AdminChatMessage[] = next.map((m) => ({ role: m.role, content: m.content }));

    setSending(true);
    try {
      const res = await aiAdminApi.ask(payload);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.reply, toolCalls: res.data.toolCalls },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chat failed';
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <Page>
      <Banner>
        <Sparkles size={16} />
        AI Admin Console — שאל כל שאלה תפעולית. ה-AI ישלוף נתונים בעצמו דרך הכלים שלו.
      </Banner>

      {messages.length === 0 && (
        <Suggestions>
          {SUGGESTIONS.map((s) => (
            <SuggestChip key={s} onClick={() => send(s)} disabled={sending}>
              {s}
            </SuggestChip>
          ))}
        </Suggestions>
      )}

      <Messages ref={scrollRef}>
        {messages.map((m, i) => (
          <Row key={i} $role={m.role}>
            <Avatar $role={m.role}>{m.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}</Avatar>
            <div style={{ maxWidth: '85%' }}>
              <Bubble $role={m.role}>{m.content}</Bubble>
              {m.role === 'assistant' && m.toolCalls && <ToolCallsBlock calls={m.toolCalls} />}
            </div>
          </Row>
        ))}
        {sending && (
          <Row $role="assistant">
            <Avatar $role="assistant"><Bot size={14} /></Avatar>
            <Bubble $role="assistant">Thinking…</Bubble>
          </Row>
        )}
        {error && (
          <Row $role="assistant">
            <Avatar $role="assistant"><Bot size={14} /></Avatar>
            <Bubble $role="assistant" style={{ borderColor: '#fecaca', color: '#b91c1c' }}>
              {error}
            </Bubble>
          </Row>
        )}
      </Messages>

      <Composer onSubmit={onSubmit}>
        <Input
          placeholder="Ask anything about the system…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={sending}
        />
        <SendBtn type="submit" disabled={sending || !input.trim()} aria-label="send">
          <Send size={18} />
        </SendBtn>
      </Composer>
    </Page>
  );
}
