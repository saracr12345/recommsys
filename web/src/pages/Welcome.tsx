import { useNavigate } from 'react-router-dom';
import { pageShell, card, primaryButton } from '@/ui/styles';
import { useAuth } from '@/features/auth/AuthContext';
import type { CSSProperties } from 'react';

export default function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayEmail = user?.email ?? 'there';

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Welcome, {displayEmail} 👋</h1>
        <p style={textStyle}>
          Your account is ready. You can now explore LLM research, track feeds,
          and get model recommendations tailored to your tasks.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            style={primaryButtonStyle}
            onClick={() => navigate('/advisor')}
          >
            Go to Advisor
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => navigate('/')}
          >
            Browse LLMExplore
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  ...pageShell,
  alignItems: 'center',
};

const cardStyle: CSSProperties = {
  ...card,
  width: 520,
  textAlign: 'left',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
  color: '#0f172a',
};

const textStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 14,
  color: '#475569',
};

const primaryButtonStyle: CSSProperties = {
  ...primaryButton,
};

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 14,
};
