// web/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import NotFound from '@/pages/NotFound'
import TrackerPage from '@/pages/TrackerPage'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import { CommunityFeedPage } from '@/pages/CommunityFeedPage'
import AIChatPage from '@/pages/AIChat'
import AdvisorPage from '@/pages/AdvisorPage'

import TopNav from '@/features/layout/TopNav'
import Sidebar from '@/features/layout/Sidebar'

import { useState } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'

function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav sidebarCollapsed={sidebarCollapsed} />
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Shell>
            <Routes>
              {/* ✅ HOME NOW GOES TO EXPLORE */}
              <Route path="/" element={<Navigate to="/explore" replace />} />

              {/* ✅ EXPLORE WORKS AGAIN */}
              <Route path="/explore" element={<TrackerPage />} />

              {/* keep tracker if you still use it anywhere */}
              <Route path="/tracker" element={<TrackerPage />} />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* ✅ COMMUNITY: support old /feed links */}
              <Route path="/community" element={<CommunityFeedPage />} />
              <Route path="/feed" element={<Navigate to="/community" replace />} />

              <Route path="/chat" element={<AIChatPage />} />

              {/* ✅ main recommender page */}
              <Route path="/advisor" element={<AdvisorPage />} />

              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Shell>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  )
}