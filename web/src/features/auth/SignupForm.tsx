import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  pageShell,
  card,
  input,
  primaryButton,
  colors,
} from '@/ui/styles';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');

    try {
      const data = await api<{
        ok: boolean;
        user?: { id: number; email: string };
        error?: string;
      }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.ok && data.user) {
        setUser(data.user);
        setMsg('Account created!');
        navigate('/welcome');
      } else {
        setMsg(data.error || 'Sign up failed');
      }
    } catch (err: any) {
      setMsg(err?.message || 'Network error');
    } finally {
      setSubmitting(false);
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
              color: colors.textMain,
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
              color: colors.textMuted,
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

        {!!msg && (
          <div style={messageStyle}>
            {msg}
          </div>
        )}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
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
  color: colors.textMuted,
};

const inputStyle: CSSProperties = {
  ...input,
  boxSizing: 'border-box',
} as const;

const buttonStyle: CSSProperties = {
  ...primaryButton,
  marginTop: 8,
  width: '100%',
};

const messageStyle: CSSProperties = {
  marginTop: 8,
  padding: 8,
  borderRadius: 8,
  fontSize: 13,
  textAlign: 'center',
  background: colors.blueSoft,
  border: `1px solid ${colors.blueBorder}`,
  color: '#035781',
};
