// web/src/pages/AIChat.tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { colors, input as inputBase, primaryButton } from '@/ui/styles';

type Msg = { role: 'user' | 'assistant'; content: string };
type Thread = { id: number; title: string; createdAt: string };

export default function AIChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // auth redirect
  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  function shortTitle(title: string) {
    const t = String(title || '').trim();
    if (!t) return 'New chat…';
    const words = t.split(/\s+/).filter(Boolean);
    const two = words.slice(0, 2).join(' ');
    return words.length > 2 ? `${two}…` : two;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      requestAnimationFrame(() => {
        const s2 = scrollerRef.current;
        if (s2) s2.scrollTop = s2.scrollHeight;
      });
    });
  }

  // Load chat threads on mount.
  // IMPORTANT CHANGE: We do NOT auto-load the previous conversation anymore.
  // When user returns to AI Chat, we ALWAYS start a new chat.
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        setError('');
        const data = await api<{ ok: boolean; threads: Thread[]; error?: string }>(
          '/chat/threads',
          { method: 'GET' },
        );

        if (!data.ok) throw new Error(data.error || 'Failed to load threads');
        setThreads(data.threads ?? []);

        // Start fresh chat every time user returns here
        setThreadId(null);
        setMessages([]);
        setInput('');
        setSending(false);

        // ensure view is at bottom (empty composer area)
        scrollToBottom('auto');
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load chats');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep view at bottom when a message arrives (only matters for active chat)
  useEffect(() => {
    scrollToBottom('auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, sending]);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function refreshThreads() {
    const data = await api<{ ok: boolean; threads: Thread[]; error?: string }>('/chat/threads', {
      method: 'GET',
    });
    if (!data.ok) throw new Error(data.error || 'Failed to reload threads');
    setThreads(data.threads ?? []);
  }

  async function selectThread(id: number) {
    setError('');
    setThreadId(id);

    const data = await api<{
      ok: boolean;
      threadId: number;
      messages: Array<{ role: string; content: string }>;
      error?: string;
    }>(`/chat/thread/${id}`, { method: 'GET' });

    if (!data.ok) throw new Error(data.error || 'Failed to load thread');

    const msgs: Msg[] = (data.messages ?? [])
      .map((m): Msg => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as Msg['role'],
        content: String(m.content || ''),
      }))
      .filter((m) => m.content.trim().length > 0);

    setMessages(msgs);

    // After switching threads, jump to end of that convo
    setTimeout(() => scrollToBottom('auto'), 0);
  }

  function startNewChat() {
    setError('');
    setInput('');
    setThreadId(null);
    setMessages([]);
    setTimeout(() => scrollToBottom('auto'), 0);
  }

  async function send() {
    if (!canSend) return;

    setError('');
    setSending(true);

    const text = input.trim();
    setInput('');

    // optimistic user message
    setMessages((m) => [...m, { role: 'user', content: text }]);

    try {
      const data = await api<{
        ok: boolean;
        threadId: number;
        reply: string;
        error?: string;
      }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ threadId, message: text }),
      });

      if (!data.ok) throw new Error(data.error || 'Chat failed');

      // New thread created on first message
      if (threadId == null) {
        setThreadId(data.threadId);
        await refreshThreads();
      }

      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      setTimeout(() => scrollToBottom('auto'), 0);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={pageWrap}>
      {/* MAIN CHAT (center) */}
      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: colors.textMain }}>AI Chat</h1>
            <p style={{ marginTop: 6, color: colors.textMuted, fontSize: 14 }}>
              Ask about LLMs, benchmarks, or which model to use.
            </p>
          </div>
          <div style={pillBadge}>Beta</div>
        </header>

        <div style={chatShell}>
          <div ref={scrollerRef} style={chatScroller}>
            {messages.length === 0 ? (
              <div style={emptyState}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Try something like:</div>
                <div style={emptyHint}>• “Explain RAG in simple terms”</div>
                <div style={emptyHint}>• “Which model should I use for financial sentiment?”</div>
                <div style={emptyHint}>• “What does this recommendation pipeline mean?”</div>
              </div>
            ) : (
              <div style={msgList}>
                {messages.map((m, idx) => (
                  <ChatBubble key={idx} msg={m} />
                ))}

                {sending && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ ...bubbleBase, ...assistantBubble }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Assistant</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Dot />
                        <Dot delay={120} />
                        <Dot delay={240} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && <div style={errBox}>{error}</div>}

          <div style={composer}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              style={composerInput}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />

            <button
              onClick={() => void send()}
              disabled={!canSend}
              style={{
                ...pillButtonBase,
                ...(canSend ? null : pillButtonDisabled),
              }}
              onMouseEnter={(e) => {
                if (canSend) e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </main>

      {/* RIGHT CHAT HISTORY (same height as chat box) */}
      <aside style={sidebar}>
        <div style={sidebarTop}>
          <div style={sidebarTitle}>Chats</div>
          <button
            onClick={startNewChat}
            style={pillSecondaryBtn}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            + New chat
          </button>
        </div>

        <div style={threadList}>
          {threads.length === 0 ? (
            <div style={threadEmpty}>No chats yet.</div>
          ) : (
            threads.map((t) => {
              const active = t.id === threadId;
              return (
                <button
                  key={t.id}
                  style={{
                    ...threadPill,
                    ...(active ? threadPillActive : null),
                  }}
                  onClick={() => void selectThread(t.id)}
                  title={t.title}
                >
                  {shortTitle(t.title)}
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- Bubble + Markdown ---------------- */

function ChatBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ ...bubbleBase, ...(isUser ? userBubble : assistantBubble) }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{isUser ? 'You' : 'Assistant'}</div>

        <div style={mdWrap}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              p: ({ children }) => <p style={mdP}>{children}</p>,
              li: ({ children }) => <li style={mdLi}>{children}</li>,
              ul: ({ children }) => <ul style={mdUl}>{children}</ul>,
              ol: ({ children }) => <ol style={mdOl}>{children}</ol>,
              h1: ({ children }) => <h1 style={mdH1}>{children}</h1>,
              h2: ({ children }) => <h2 style={mdH2}>{children}</h2>,
              h3: ({ children }) => <h3 style={mdH3}>{children}</h3>,
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noreferrer" style={mdLink}>
                  {children}
                </a>
              ),
              code: ({ className, children }) => {
                const isBlock = typeof className === 'string' && className.includes('language-');
                const text = String(children ?? '').replace(/\n$/, '');
                if (!isBlock) return <code style={mdInlineCode}>{text}</code>;

                return (
                  <pre style={mdPre}>
                    <code style={mdCode} className={className}>
                      {text}
                    </code>
                  </pre>
                );
              },
              blockquote: ({ children }) => <blockquote style={mdQuote}>{children}</blockquote>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  const [up, setUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const id = setInterval(() => setUp((v) => !v), 420);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: colors.textMuted,
        display: 'inline-block',
        transform: up ? 'translateY(-2px)' : 'translateY(2px)',
        transition: 'transform 180ms ease',
        opacity: 0.85,
      }}
    />
  );
}

/* ---------------- Layout styles ---------------- */

const pageWrap: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(680px, 860px) 260px',
  justifyContent: 'center',
  gap: 18,
  paddingTop: 24,
  paddingBottom: 24,
  paddingLeft: 150,
  paddingRight: 24,
  maxWidth: 1300,
  margin: '0 auto',
  alignItems: 'start',
};


const main: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',

  transform: 'translateX(12px)',
};

const header: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 12,
};

const pillBadge: CSSProperties = {
  alignSelf: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  color: colors.textMuted,
  fontSize: 12,
  fontWeight: 700,
};

const chatShell: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: 22,
  boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '70vh', 
};

const chatScroller: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 18,
  background: 'linear-gradient(180deg, rgba(250,250,250,1) 0%, rgba(255,255,255,1) 60%)',
};

const msgList: CSSProperties = {
  display: 'grid',
  gap: 12,
};

const bubbleBase: CSSProperties = {
  maxWidth: '78%',
  padding: 14,
  borderRadius: 20,
  border: `1px solid ${colors.borderSubtle}`,
  boxShadow: '0 10px 22px rgba(0,0,0,0.05)',
};

const userBubble: CSSProperties = {
  background: colors.blueSoft,
  borderColor: colors.blueBorder,
};

const assistantBubble: CSSProperties = {
  background: colors.white,
  borderColor: colors.borderSubtle,
};

const composer: CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: 14,
  borderTop: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
};

const composerInput: CSSProperties = {
  ...inputBase,
  flex: 1,
  borderRadius: 18,
  resize: 'none',
  paddingTop: 12,
  paddingBottom: 12,
};

const pillButtonBase: CSSProperties = {
  ...primaryButton,
  borderRadius: 999,
  padding: '12px 18px',
  transition: 'transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease',
  boxShadow: '0 10px 24px rgba(0,103,79,0.20)',
};

const pillButtonDisabled: CSSProperties = {
  opacity: 0.55,
  cursor: 'default',
  boxShadow: 'none',
};

const errBox: CSSProperties = {
  margin: 14,
  padding: 12,
  borderRadius: 14,
  background: colors.dangerSoft,
  border: `1px solid ${colors.dangerBorder}`,
  color: colors.danger,
  fontSize: 13,
};

const emptyState: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: `1px dashed ${colors.borderSubtle}`,
  background: colors.white,
  color: colors.textMain,
};

const emptyHint: CSSProperties = {
  color: colors.textMuted,
  fontSize: 14,
  marginTop: 4,
};

/* ---------------- Right sidebar (history) ---------------- */

const sidebar: CSSProperties = {
  width: '100%',
  background: colors.white,
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: 22,
  boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',

  height: '70vh',

  marginTop: 75,
};

const sidebarTop: CSSProperties = {
  padding: 12,
  borderBottom: `1px solid ${colors.borderSubtle}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const sidebarTitle: CSSProperties = {
  fontWeight: 900,
  fontSize: 14,
  color: colors.textMain,
};

const threadList: CSSProperties = {
  padding: 10,
  display: 'grid',
  gap: 10,
  overflowY: 'auto',
};

const threadEmpty: CSSProperties = {
  padding: 12,
  color: colors.textMuted,
  fontSize: 13,
};

const threadPill: CSSProperties = {
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  borderRadius: 999,
  padding: '10px 12px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 13,
  color: colors.textMain,
  textAlign: 'left',
  boxShadow: '0 8px 18px rgba(0,0,0,0.04)',
  transition: 'transform 140ms ease, box-shadow 140ms ease',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const threadPillActive: CSSProperties = {
  borderColor: colors.blueBorder,
  background: colors.blueSoft,
};

const pillSecondaryBtn: CSSProperties = {
  borderRadius: 999,
  padding: '10px 12px',
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 12,
  color: colors.textMain,
  transition: 'transform 140ms ease, box-shadow 140ms ease',
  boxShadow: '0 8px 18px rgba(0,0,0,0.04)',
};

/* ---------------- Markdown styles ---------------- */

const mdWrap: CSSProperties = { lineHeight: 1.55, fontSize: 14 };
const mdP: CSSProperties = { margin: '8px 0' };
const mdUl: CSSProperties = { margin: '8px 0', paddingLeft: 18 };
const mdOl: CSSProperties = { margin: '8px 0', paddingLeft: 18 };
const mdLi: CSSProperties = { margin: '4px 0' };
const mdH1: CSSProperties = { fontSize: 18, margin: '10px 0 6px', fontWeight: 900 };
const mdH2: CSSProperties = { fontSize: 16, margin: '10px 0 6px', fontWeight: 900 };
const mdH3: CSSProperties = { fontSize: 15, margin: '10px 0 6px', fontWeight: 900 };
const mdLink: CSSProperties = { color: colors.textMain, fontWeight: 800, textDecoration: 'underline' };
const mdInlineCode: CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 13,
  padding: '2px 6px',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.06)',
};
const mdPre: CSSProperties = {
  margin: '10px 0',
  padding: 12,
  borderRadius: 14,
  overflowX: 'auto',
  background: 'rgba(0,0,0,0.06)',
};
const mdCode: CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 13,
};
const mdQuote: CSSProperties = {
  margin: '10px 0',
  padding: '8px 12px',
  borderLeft: `4px solid ${colors.borderSubtle}`,
  background: 'rgba(0,0,0,0.03)',
  borderRadius: 10,
};
