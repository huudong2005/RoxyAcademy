import React from 'react';
import {
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
  useLocation,
  useNavigate,
} from 'zmp-ui';
import { Routes, Navigate } from 'react-router-dom';
import logo from '@/assets/logo-roxy-v2.svg';
import AppHeader from '@/components/AppHeader';
import BottomNavBar, { type TabKey } from '@/components/BottomNavBar';
import { AuthProvider, useAuth } from '@/context/authContext';
import HomeworksPage from '@/pages/HomeworksPage';
import LoginPage from '@/pages/LoginPage';
import SchedulesPage from '@/pages/SchedulesPage';
import TabPlaceholderPage from '@/pages/TabPlaceholderPage';
import TodayPage from '@/pages/TodayPage';

function resolveActiveTab(pathname: string): TabKey {
  if (pathname.startsWith('/schedules')) return '/schedules';
  if (pathname.startsWith('/homeworks')) return '/homeworks';
  if (pathname.startsWith('/tuitions')) return '/tuitions';
  if (pathname.startsWith('/account')) return '/account';
  return '/today';
}

function AuthenticatedShell() {
  const { initializing, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (initializing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-mint-canvas p-6 text-center">
        <img
          src={logo}
          alt="Roxy Academy"
          className="mb-4 h-14 w-auto animate-pulse"
        />
        <p className="text-xs font-medium text-ink-secondary">
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          navigate('/today', { replace: true });
        }}
      />
    );
  }

  const activeTab = resolveActiveTab(location.pathname);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-mint-canvas text-ink">
      <AppHeader />

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route
            path="/"
            element={<TodayPage />}
          />
          <Route
            path="/today"
            element={<TodayPage />}
          />
          <Route
            path="/schedules"
            element={<SchedulesPage />}
          />
          <Route
            path="/homeworks"
            element={<HomeworksPage />}
          />
          <Route
            path="/tuitions"
            element={<TabPlaceholderPage tab="/tuitions" />}
          />
          <Route
            path="/account"
            element={<TabPlaceholderPage tab="/account" />}
          />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>

      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          navigate(tab);
        }}
      />
    </div>
  );
}

const Layout = () => {
  return (
    <App theme="light">
      <SnackbarProvider>
        <AuthProvider>
          <ZMPRouter>
            <AuthenticatedShell />
          </ZMPRouter>
        </AuthProvider>
      </SnackbarProvider>
    </App>
  );
};

export default Layout;
