import { useState, type CSSProperties, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

type NavItemProps = {
  to: string
  label: string
  icon: ReactNode
  collapsed: boolean
}

function NavItem({ to, label, icon, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...navItemBase,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 8px',
        background: isActive ? '#f3f4f6' : 'transparent',
      })}
      title={collapsed ? label : undefined}
    >
      <span style={navIconStyle}>{icon}</span>
      {!collapsed && <span style={{ fontSize: 14 }}>{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [logoHover, setLogoHover] = useState(false)
  const width = collapsed ? 44 : 260

  return (
    <aside
      style={{
        width,
        borderRight: '1px solid rgba(15,23,42,0.08)', // thin line FOR top nav
        background: '#ffffff',
        padding: collapsed ? '8px 4px' : '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        boxSizing: 'border-box',
        transition: 'width 0.2s ease',
        color: '#111827',
      }}
    >
      {/* TOP SECTION */}
      <div>
        {collapsed ? (
          // COLLAPSED: tiny LLM box; hover ⇒ arrow; click ⇒ expand
          <button
            type="button"
            onClick={onToggle}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            style={collapsedLogoButton}
            title="Expand sidebar"
          >
            {logoHover ? (
              <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
            ) : (
              <span style={collapsedLogoText}>LLM</span>
            )}
          </button>
        ) : (
          // EXPANDED: logo + round collapse button
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
              }}
            >
              <span style={logoBox}>LLM</span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                Area
              </span>
            </div>

            <button
              type="button"
              onClick={onToggle}
              title="Collapse sidebar"
              style={toggleButtonStyle}
            >
              ‹
            </button>
          </div>
        )}

        {/* NAV ITEMS */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: collapsed ? 16 : 0,
          }}
        >
          <NavItem
            to="/aichat"
            label="New Chat"
            collapsed={collapsed}
            icon={<span style={{ fontSize: 16 }}>✏︎</span>}
          />
          <NavItem
            to="/"
            label="LLM Explore Feed"
            collapsed={collapsed}
            icon={<span style={{ fontSize: 16 }}>▦</span>}
          />
          <NavItem
            to="/advisor"
            label="Advisor"
            collapsed={collapsed}
            // black star icon
            icon={<span style={{ fontSize: 16 }}>★</span>}
          />
        </nav>
      </div>

      {/* FOOTER – only when expanded */}
      {!collapsed && (
        <div
          style={{
            fontSize: 12,
            color: '#4b5563',
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

/* ---------- shared styles ---------- */

const logoBox: CSSProperties = {
  border: '1px solid #111',
  padding: '0 4px',
  fontSize: 9,
  letterSpacing: 1,
  fontWeight: 700,
  borderRadius: 3,
}

const toggleButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: '1px solid #d1d5db',
  background: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  color: '#111827',
}

/* collapsed logo button (LLM ↔ arrow) */
const collapsedLogoButton: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: '1px solid #111827',
  background: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '4px auto 12px',
}

const collapsedLogoText: CSSProperties = {
  fontSize: 9,
  letterSpacing: 1,
  fontWeight: 700,
}

/* nav items */

const navItemBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 999,
  height: 32,
  textDecoration: 'none',
  color: '#111827',
  cursor: 'pointer',
  transition: 'background 0.12s ease',
}

const navIconStyle: CSSProperties = {
  width: 20,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#111827',
}

/* footer buttons */

const secondaryItemStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  fontSize: 12,
  padding: 0,
  cursor: 'pointer',
  color: '#4b5563',
}
