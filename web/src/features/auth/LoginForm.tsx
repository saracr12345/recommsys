// web/src/features/auth/LoginForm.tsx
import { useState, type CSSProperties, type FormEvent } from 'react'
import { pageShell, card, input, primaryButton } from '@/ui/styles'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('') // hook up real auth later
    // TODO: call your backend / Firebase etc.
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
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
            Login
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
            Access your LLM Area account.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {/* Email */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <button type="submit" style={buttonStyle}>
          Login
        </button>

        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          Forgot your password? <span style={{ color: '#1d4ed8' }}>Reset it</span>
        </div>
      </form>
    </div>
  )
}

/* ---------- styles ---------- */

const pageStyle: CSSProperties = {
  ...pageShell,
}

const cardStyle: CSSProperties = {
  ...card,
  width: 380,
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
  ...input,
  boxSizing: 'border-box', // keep explicit to avoid overflow
} as const

const buttonStyle: CSSProperties = {
  ...primaryButton,
  marginTop: 8,
  width: '100%',
}

const errorStyle: CSSProperties = {
  marginTop: 8,
  padding: 8,
  borderRadius: 8,
  background: '#fee2e2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  fontSize: 13,
  textAlign: 'center',
}
