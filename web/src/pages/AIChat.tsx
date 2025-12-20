import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // if not logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !sending,
    [input, sending]
  );

  async function send() {
    if (!canSend) return;

    setError("");
    setSending(true);

    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);

    try {
      const data = await api<{ ok: boolean; threadId: number; reply: string; error?: string }>(
        "/chat",
        {
          method: "POST",
          body: JSON.stringify({ threadId, message: text }),
        }
      );

      if (!data.ok) throw new Error(data.error || "Chat failed");

      setThreadId(data.threadId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={wrap}>
      <h1 style={{ margin: 0, fontSize: 22 }}>AI Chat</h1>
      <p style={{ marginTop: 6, color: "#64748b" }}>
        Ask about LLMs, benchmarks, or which model to use.
      </p>

      <div style={chatBox}>
        {messages.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 14 }}>
            Try: “Explain what RAG is”
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  ...bubble,
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#dbeafe" : "#ffffff",
                  borderColor: m.role === "user" ? "#bfdbfe" : "#e2e8f0",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button onClick={() => void send()} disabled={!canSend} style={sendBtn}>
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = {
  fontFamily:
    "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  padding: 24,
  maxWidth: 960,
  margin: "0 auto",
  color: "#0f172a",
};

const chatBox: CSSProperties = {
  marginTop: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
  minHeight: 360,
  display: "flex",
  flexDirection: "column",
};

const bubble: CSSProperties = {
  maxWidth: "78%",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  background: "#ffffff",
};

const composer: CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  outline: "none",
};

const sendBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "#3b82f6",
  color: "#fff",
  cursor: "pointer",
};

const errBox: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
};
