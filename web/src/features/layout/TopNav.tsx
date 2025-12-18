import type React from 'react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

const tabBaseStyle: React.CSSProperties = {
  fontSize: 15,
  paddingBottom: 4,
  textDecoration: 'none',
};

type TabLinkProps = {
  to: string;
  children: React.ReactNode;
};

function TabLink({ to, children }: TabLinkProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...tabBaseStyle,
        color: isActive ? '#111827' : '#6b7280',
        borderBottom: isActive
          ? '2px solid #111827'
          : '2px solid transparent',
        cursor: 'pointer',
        fontWeight: hovered ? 600 : 500,
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </NavLink>
  );
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email
    ? user.email.trim()[0]?.toUpperCase() || 'U'
    : 'U';

  const shortEmail =
    user?.email && user.email.length > 24
      ? user.email.slice(0, 24) + '…'
      : user?.email ?? '';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#ffffff',
        // thin line across the top nav
        borderBottom: '1px solid rgba(15,23,42,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1300,
          margin: '0 auto',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* LEFT SPACER */}
        <div style={{ flex: 1 }} />

        {/* CENTER TABS */}
        <nav
          style={{
            display: 'flex',
            gap: 28,
            justifyContent: 'center',
          }}
        >
          <TabLink to="/">LLMExplore</TabLink>
          <TabLink to="/advisor">Advisor</TabLink>
          <TabLink to="/aichat">AIChat</TabLink>
        </nav>

        {/* RIGHT SIDE – auth controls */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 20,
            paddingRight: 8,
          }}
        >
          {user ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {/* avatar + email acts as "profile" */}
              <button
                type="button"
                onClick={() => navigate('/welcome')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={user.email}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background:
                      'linear-gradient(135deg,#3b82f6,#6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: '#374151',
                  }}
                >
                  {shortEmail}
                </span>
              </button>

              {/* small logout link */}
              <button
                type="button"
                onClick={() => {
                  void logout();
                  navigate('/login');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <NavLink
                to="/login"
                style={({ isActive }) => ({
                  fontSize: 14,
                  textDecoration: 'none',
                  color: isActive ? '#111827' : '#4b5563',
                  cursor: 'pointer',
                })}
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                style={({ isActive }) => ({
                  fontSize: 14,
                  textDecoration: 'none',
                  color: isActive ? '#111827' : '#4b5563',
                  cursor: 'pointer',
                })}
              >
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
