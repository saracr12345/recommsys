import { useNavigate } from 'react-router-dom';
import { pageShell, card, primaryButton, secondaryButton, colors } from '@/ui/styles';
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
            Browse Explore
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
  color: colors.textMain,
};

const textStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 14,
  color: colors.textMuted,
};

const primaryButtonStyle: CSSProperties = {
  ...primaryButton,
};

const secondaryButtonStyle: CSSProperties = {
  ...secondaryButton,
};
