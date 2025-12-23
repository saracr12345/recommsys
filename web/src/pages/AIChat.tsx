import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { colors, input as inputBase, primaryButton } from '@/ui/styles';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AIChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // if not logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !sending,
    [input, sending],
  );

  async function send() {
    if (!canSend) return;

    setError('');
    setSending(true);

    const text = input.trim();
    setInput('');
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

      setThreadId(data.threadId);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={wrap}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: colors.textMain }}>
          AI Chat
        </h1>
        <p style={{ marginTop: 6, color: colors.textMuted, fontSize: 14 }}>
          Ask about LLMs, benchmarks, or which model to use.
        </p>
      </header>

      <div style={chatBox}>
        {messages.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 14 }}>
            Try: “Explain what RAG is”
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  ...bubble,
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background:
                    m.role === 'user' ? colors.blueSoft : colors.white,
                  borderColor:
                    m.role === 'user'
                      ? colors.blueBorder
                      : colors.borderSubtle,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={errBox}>{error}</div>}

      <div style={composer}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          style={inputStyle}
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
            ...sendBtn,
            opacity: canSend ? 1 : 0.6,
            cursor: canSend ? 'pointer' : 'default',
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = {
  padding: 24,
  maxWidth: 960,
  margin: '0 auto',
  color: colors.textMain,
};

const chatBox: CSSProperties = {
  marginTop: 14,
  background: colors.white,
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: 18,
  padding: 16,
  minHeight: 360,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 28px rgba(0,0,0,0.04)',
};

const bubble: CSSProperties = {
  maxWidth: '78%',
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: 14,
  padding: 12,
  background: colors.white,
};

const composer: CSSProperties = {
  marginTop: 14,
  display: 'flex',
  gap: 10,
};

const inputStyle: CSSProperties = {
  ...inputBase,
  flex: 1,
};

const sendBtn: CSSProperties = {
  ...primaryButton,
  borderRadius: 999,
  boxShadow: '0 8px 20px rgba(0,103,79,0.25)',
};

const errBox: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: colors.dangerSoft,
  border: `1px solid ${colors.dangerBorder}`,
  color: colors.danger,
  fontSize: 13,
};
