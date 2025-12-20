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
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.email
    ? user.email.trim()[0]?.toUpperCase() || 'U'
    : 'U';

  const shortEmail =
    user?.email && user.email.length > 24
      ? user.email.slice(0, 24) + '…'
      : user?.email ?? '';

  function handleDashboardClick() {
    setMenuOpen(false);
    navigate('/dashboard');
  }

  function handleLogoutClick() {
    setMenuOpen(false);
    void logout();
    navigate('/login');
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#ffffff',
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

        {/* RIGHT SIDE – avatar + menu */}
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
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
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

              {/* DROPDOWN MENU */}
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '115%',
                    minWidth: 180,
                    background: '#ffffff',
                    borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
                    border: '1px solid rgba(148,163,184,0.35)',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 50,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDashboardClick}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#111827',
                      cursor: 'pointer',
                    }}
                  >
                    Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#b91c1c',
                      cursor: 'pointer',
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
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
