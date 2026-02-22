// src/features/layout/TopNav.tsx
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, LayoutDashboard, Menu, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'

type TopNavProps = {
  sidebarCollapsed: boolean
}

type NavItem = {
  label: string
  to: string
  end?: boolean
}

const navItems: NavItem[] = [
  { label: 'Explore', to: '/', end: true },
  { label: 'Recommend', to: '/advisor' },
  { label: 'Community', to: '/feed' },
  { label: 'Chat', to: '/aichat' },
]

function DesktopNav() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'px-4 py-2 text-sm font-medium transition-all duration-200 relative rounded-lg',
              isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              {isActive && (
                <div className="absolute left-3 right-3 bottom-1 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default function TopNav({ sidebarCollapsed }: TopNavProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close menus when route changes
  useEffect(() => {
    setMenuOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  const initials = useMemo(() => {
    return user?.email ? user.email.trim()[0]?.toUpperCase() || 'U' : 'U'
  }, [user?.email])

  const shortEmail = useMemo(() => {
    const email = user?.email ?? ''
    return email.length > 24 ? email.slice(0, 24) + '…' : email
  }, [user?.email])

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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT SPACER (logo removed) */}
          <div className="w-10">{sidebarCollapsed ? null : null}</div>

          {/* Desktop Navigation */}
          <DesktopNav />

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all duration-200 group"
                  title={user.email}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold shadow-md group-hover:shadow-lg transition-shadow">
                    {initials}
                  </div>
                  <span className="hidden sm:inline text-sm text-slate-700 font-medium">{shortEmail}</span>
                  <ChevronDown
                    className={cn('w-4 h-4 text-slate-600 transition-transform duration-200', menuOpen && 'rotate-180')}
                  />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Account</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{user.email}</p>
                    </div>

                    <div className="py-2 space-y-1">
                      <button
                        type="button"
                        onClick={handleDashboardClick}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 group"
                      >
                        <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Dashboard</span>
                      </button>

                      <div className="h-px bg-slate-200 my-1" />

                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                      >
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-2 text-sm font-medium transition-colors rounded-lg',
                      isActive ? 'text-emerald-700' : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-100',
                    )
                  }
                >
                  Login
                </NavLink>

                <NavLink
                  to="/signup"
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg hover:scale-105',
                    )
                  }
                >
                  Sign up
                </NavLink>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 py-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {!user && (
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <NavLink
                  to="/login"
                  className="flex-1 text-center px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-all duration-200"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className="flex-1 text-center px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200"
                >
                  Sign up
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}