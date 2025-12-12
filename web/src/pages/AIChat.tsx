// web/src/pages/AIChat.tsx

export default function AIChatPage() {
    return (
      <div
        style={{
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          padding: 24,
          maxWidth: 960,
          margin: '0 auto',
          color: '#0f172a',
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>AI Chat</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          This will be your interactive AI assistant area. Soon you’ll be able to
          chat about LLMs, ask for model advice, and explore examples here.
        </p>
  
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: 20,
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            display: 'grid',
            gap: 16,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            👋 AI Chat coming soon
          </div>
  
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: '#475569',
              fontSize: 14,
              display: 'grid',
              gap: 4,
            }}
          >
            <li>Ask questions about LLM research and benchmarks.</li>
            <li>Get model recommendations for your specific tasks.</li>
            <li>Save useful chats as presets for later.</li>
          </ul>
  
          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e3a8a',
              fontSize: 13,
            }}
          >
            For now, use the <b>LLMExplore</b> and <b>Advisor</b> tabs to
            track research and compare models. AI Chat will plug into those next.
          </div>
        </div>
      </div>
    )
  }
  