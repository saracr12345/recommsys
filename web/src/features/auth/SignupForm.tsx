import { useState, type CSSProperties, type FormEvent } from 'react'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')

    try {
      const r = await fetch('http://localhost:8787/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json().catch(() => ({}))

      if (r.ok && data?.ok) {
        setMsg('Account created. You can log in now.')
      } else {
        setMsg(data?.error || 'Sign up failed')
      }
    } catch {
      setMsg('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={submit} style={cardStyle}>
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
            Create account
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
            Start using LLM Area with a free account.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {/* Email */}
          <div style={fieldStyle}>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={fieldStyle}>
            <label htmlFor="password" style={labelStyle}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {!!msg && <div style={messageStyle}>{msg}</div>}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

/* ---------- styles ---------- */

const pageStyle: CSSProperties = {
  background: '#f8fafc', // same as leaderboard / advisor / login
  minHeight: 'calc(100vh - 56px)', // allow for top nav
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
  width: 380,
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
  boxSizing: 'border-box',   //inside the card
} as const

const buttonStyle: CSSProperties = {
  marginTop: 8,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #1d4ed8',
  background: '#3b82f6',
  color: '#ffffff',
  width: '100%',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
}

const messageStyle: CSSProperties = {
  marginTop: 8,
  padding: 8,
  borderRadius: 8,
  fontSize: 13,
  textAlign: 'center',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#1d4ed8',
}
