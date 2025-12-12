import type React from 'react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

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
  )
}

export default function TopNav() {
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
          {/* was "Leaderboard" */}
          <TabLink to="/advisor">Advisor</TabLink>
          <TabLink to="/aichat">AIChat</TabLink>
        </nav>

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
        </div>
      </div>
    </header>
  )
}
