import { useState, type CSSProperties } from 'react'

export default function App() {
  const [task, setTask] = useState('financial sentiment')
  const [privacy, setPrivacy] = useState('Self-host')
  const [latency, setLatency] = useState(1200)
  const [ctx, setCtx] = useState(4000)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState('')

  async function recommend() {
    setLoading(true)
    setError('')
    setResults([])

    try {
      const r = await fetch('http://localhost:8787/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          privacy,
          latency,
          context: ctx,
        }),
      })

      if (!r.ok) throw new Error('Recommendation failed')

      const data = await r.json()
      setResults(data.results)
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#0f172a',
              textAlign: 'center',
            }}
          >
            LLM Advisor
          </h2>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: '#475569',
              textAlign: 'center',
            }}
          >
            Input your task → get the best model ranked for you.
          </p>
        </div>

        {/* FORM FIELDS */}
        <div style={{ display: 'grid', gap: 12 }}>
          {/* TASK FIELD */}
          <div style={fieldStyle}>
            <div style={labelStyle}>Task</div>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. financial sentiment, classification, extraction"
              style={inputStyle}
            />
          </div>

          {/* PRIVACY FIELD */}
          <div style={fieldStyle}>
            <div style={labelStyle}>Privacy</div>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              style={inputStyle}
            >
              <option>Self-host</option>
              <option>Cloud</option>
              <option>Any</option>
            </select>
          </div>

          {/* LATENCY */}
          <div style={fieldStyle}>
            <div style={labelStyle}>Latency target (ms)</div>
            <input
              type="number"
              value={latency}
              onChange={(e) => setLatency(parseInt(e.target.value || '0'))}
              style={inputStyle}
            />
          </div>

          {/* CONTEXT */}
          <div style={fieldStyle}>
            <div style={labelStyle}>Context tokens needed</div>
            <input
              type="number"
              value={ctx}
              onChange={(e) => setCtx(parseInt(e.target.value || '0'))}
              style={inputStyle}
            />
          </div>
        </div>

        {/* BUTTON */}
        <button onClick={recommend} disabled={loading} style={buttonStyle}>
          {loading ? 'Thinking…' : 'Recommend'}
        </button>

        {/* ERROR */}
        {error && <div style={errorStyle}>{error}</div>}

        {/* RESULTS */}
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {results.length === 0 && !loading && (
            <div style={helperTextStyle}>
              Run a recommendation to see ranked models here.
            </div>
          )}

          {results.map((res, i) => (
            <div key={res.model.name} style={resultCardStyle}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: '#0f172a',
                }}
              >
                #{i + 1} — {res.model.name}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: '#1f2937',
                  lineHeight: 1.5,
                }}
              >
                Provider: {res.model.provider}
                <br />
                Context: {res.model.context.toLocaleString()} tokens
                <br />
                Latency: {res.model.latencyMs} ms
                <br />
                Cost: ${res.model.costPer1kTokens}/1k tokens
                <br />
                Tags: {res.model.tags.join(', ')}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1d4ed8',
                }}
              >
                Score: {res.score.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- styles ---------- */

const pageStyle: CSSProperties = {
  background: '#f8fafc', // same as tracker page
  minHeight: 'calc(100vh - 56px)', // allow for top nav height
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '32px 16px',
}

const cardStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
  padding: 24,
  width: 560,
  maxWidth: '100%',
  display: 'grid',
  gap: 12,
}

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
}

const labelStyle: CSSProperties = {
  fontSize: 13,
  color: '#475569',
}

const inputStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  width: '100%',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box', // prevents overflow out of the card
} as const

const buttonStyle: CSSProperties = {
  marginTop: 8,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #1d4ed8',
  background: '#3b82f6',
  color: '#ffffff',
  width: 180,
  justifySelf: 'center',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
}

const errorStyle: CSSProperties = {
  color: '#b91c1c',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  padding: 10,
  borderRadius: 8,
  marginTop: 10,
  textAlign: 'center',
  fontSize: 13,
}

const helperTextStyle: CSSProperties = {
  textAlign: 'center',
  opacity: 0.7,
  fontSize: 13,
  color: '#6b7280',
}

const resultCardStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}
