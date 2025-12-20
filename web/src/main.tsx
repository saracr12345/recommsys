import { StrictMode, lazy, Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import TrackerPage from './pages/TrackerPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TopNav from './features/layout/TopNav';
import Sidebar from './features/layout/Sidebar';
import AIChat from './pages/AIChat';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard'; 
import { AuthProvider } from './features/auth/AuthContext';

// Lazy-load the advisor app
const AdvisorApp = lazy(() => import('./app/App'));

function Shell() {
  // CLOSED BY DEFAULT
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Full-height sidebar on the left */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Right side: top nav + scrollable router content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <TopNav />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
            <Routes>
              <Route path="/" element={<TrackerPage />} />
              <Route path="/tracker" element={<TrackerPage />} />

              <Route path="/advisor" element={<AdvisorApp />} />

              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/aichat" element={<AIChat />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
