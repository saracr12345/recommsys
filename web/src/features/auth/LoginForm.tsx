import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { pageShell, card, input, primaryButton } from '@/ui/styles';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await api<{
        ok: boolean;
        user?: { id: number; email: string };
        error?: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.ok && data.user) {
        setUser(data.user);
        navigate('/advisor');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
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

        <button type="submit" style={buttonStyle} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
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
  );
}

/* ---------- styles ---------- */

const pageStyle: CSSProperties = {
  ...pageShell,
};

const cardStyle: CSSProperties = {
  ...card,
  width: 380,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  color: '#475569',
};

const inputStyle: CSSProperties = {
  ...input,
  boxSizing: 'border-box', // avoid overflow
} as const;

const buttonStyle: CSSProperties = {
  ...primaryButton,
  marginTop: 8,
  width: '100%',
};

const errorStyle: CSSProperties = {
  marginTop: 8,
  padding: 8,
  borderRadius: 8,
  background: '#fee2e2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  fontSize: 13,
  textAlign: 'center',
};
