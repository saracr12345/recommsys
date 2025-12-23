// src/features/layout/Sidebar.tsx
import { useState, useEffect, type CSSProperties } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { colors } from '@/ui/styles'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

type NavItemProps = {
  to: string
  label: string
  iconSrc: string
  collapsed: boolean
}

function NavItem({ to, label, iconSrc, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...navItemBase,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 10px',
        background: isActive ? colors.emeraldSoft : 'transparent',
        color: isActive ? colors.emeraldDark : colors.textMain,
      })}
      title={collapsed ? label : undefined}
    >
      <img
        src={iconSrc}
        alt=""
        style={{
          width: 18,
          height: 18,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      {!collapsed && <span style={{ fontSize: 14 }}>{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [logoHover, setLogoHover] = useState(false)
  const width = collapsed ? 52 : 270
  const navigate = useNavigate()

  // reset hover whenever sidebar opens/closes
  useEffect(() => {
    setLogoHover(false)
  }, [collapsed])

  return (
    <aside
      style={{
        width,
        borderRight: `1px solid ${colors.borderSubtle}`,
        background: colors.white,
        padding: collapsed ? '6px 6px' : '6px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        boxSizing: 'border-box',
        transition: 'width 0.2s ease',
        color: colors.textMain,
      }}
    >
      {/* TOP SECTION */}
      <div>
        {collapsed ? (
          // COLLAPSED: short logo button
          <button
            type="button"
            onClick={onToggle}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            style={{
              ...collapsedLogoButton,
              position: 'relative',
              overflow: 'hidden',
            }}
            title="Expand sidebar"
          >
            {/* short logo */}
            <img
              src="/shortlogo.jpeg"
              alt="LLM Area"
              style={{
                width: 40,
                height: 40,
                objectFit: 'contain',
                display: logoHover ? 'none' : 'block',
              }}
            />

            {/* hover arrow */}
            {logoHover && (
              <span style={{ fontSize: 20, lineHeight: 1 }}>›</span>
            )}
          </button>
        ) : (
          // EXPANDED: long logo (click -> feed) + collapse chevron
          <div style={{ marginBottom: 14 }}>
            <div style={logoRow}>
              {/* logo click area -> go to Explore feed */}
              <button
                type="button"
                onClick={() => navigate('/')}
                style={logoClickButton}
                title="Go to Explore feed"
              >
                <img
                  src="/logo.jpeg"
                  alt="LLM Area"
                  style={{
                    height: 25,
                    maxWidth: '100%',
                    width: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </button>

              {/* collapse chevron */}
              <button
                type="button"
                onClick={onToggle}
                style={collapseButton}
                title="Collapse sidebar"
              >
                <span
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                >
                  ‹
                </span>
              </button>
            </div>
          </div>
        )}

        {/* NAV ITEMS */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: collapsed ? 12 : 4,
          }}
        >
          <NavItem
            to="/aichat"
            label="New Chat"
            collapsed={collapsed}
            iconSrc="/newchat.jpeg"
          />
          <NavItem
            to="/"
            label="Explore Feed"
            collapsed={collapsed}
            iconSrc="/feed.jpeg"
          />
          <NavItem
            to="/advisor"
            label="Recommend"
            collapsed={collapsed}
            iconSrc="/advisor.jpeg"
          />
        </nav>
      </div>

      {/* FOOTER – only when expanded */}
      {!collapsed && (
        <div
          style={{
            fontSize: 12,
            color: colors.textMuted,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <button style={secondaryItemStyle}>Send Feedback</button>
          <button style={secondaryItemStyle}>Report Bugs</button>
          <div style={{ marginTop: 6 }}>
            Terms of Use · Privacy Policy · Cookies
          </div>
        </div>
      )}
    </aside>
  )
}

/* ---------- styles ---------- */

const logoRow: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 10px', // align with nav items
}

const logoClickButton: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

const collapseButton: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/* collapsed logo button */
const collapsedLogoButton: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
}

/* nav items */
const navItemBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  borderRadius: 999,
  height: 36,
  textDecoration: 'none',
  color: colors.textMain,
  cursor: 'pointer',
  transition: 'background 0.12s ease, color 0.12s ease',
}

/* footer buttons */
const secondaryItemStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  fontSize: 12,
  padding: 0,
  cursor: 'pointer',
  color: colors.textMuted,
}
