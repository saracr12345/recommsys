// src/features/layout/TopNav.tsx
import type React from 'react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { colors } from '@/ui/styles'

const tabBaseStyle: React.CSSProperties = {
  fontSize: 15,
  paddingBottom: 4,
  textDecoration: 'none',
}

type TabLinkProps = {
  to: string
  children: React.ReactNode
}

function TabLink({ to, children }: TabLinkProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...tabBaseStyle,
        color: isActive ? colors.emeraldDark : colors.textMuted,
        borderBottom: isActive ? `2px solid ${colors.emerald}` : '2px solid transparent',
        cursor: 'pointer',
        fontWeight: hovered || isActive ? 600 : 500,
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </NavLink>
  )
}

export default function TopNav({
  sidebarCollapsed,
}: {
  sidebarCollapsed: boolean
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = user?.email ? user.email.trim()[0]?.toUpperCase() || 'U' : 'U'

  const shortEmail =
    user?.email && user.email.length > 24 ? user.email.slice(0, 24) + '…' : user?.email ?? ''

  function handleDashboardClick() {
    setMenuOpen(false)
    navigate('/dashboard')
  }

  function handleLogoutClick() {
    setMenuOpen(false)
    void logout()
    navigate('/login')
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: colors.white,
        borderBottom: `1px solid ${colors.borderSubtle}`,
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
          <TabLink to="/">Explore</TabLink>
          <TabLink to="/advisor">Recommend</TabLink>
          <TabLink to="/aichat">Chat</TabLink>
        </nav>

        {/* RIGHT SIDE - avatar + menu */}
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

                  marginLeft: -255, 
                }}
                title={user.email}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg,#00674F,#89cff0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.white,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: colors.textMuted,
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
                    background: colors.white,
                    borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
                    border: `1px solid ${colors.borderSubtle}`,
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
                      color: colors.textMain,
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
                      color: colors.danger,
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
                  color: isActive ? colors.emeraldDark : colors.textMuted,
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
                  color: isActive ? colors.emeraldDark : colors.textMuted,
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
  )
}
