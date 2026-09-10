import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { FarmerDashboard } from './components/FarmerDashboard.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PublicDisplayBoard } from './components/PublicDisplayBoard.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ServiceItem, UserRole } from './types.ts';
import { safeFetchJson } from './utils/api.ts';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'public-board'>('landing');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [servingCount, setServingCount] = useState<number>(0);
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState<number>(10);
  const [dbType, setDbType] = useState<string>('mongodb');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Auth Modal state for unauthenticated users
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<UserRole>('farmer');
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined);

  // Profile Modal state for logged in users
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Sync route with browser pathname
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/live-queue') {
      setCurrentView('public-board');
    } else if (path === '/farmer') {
      if (user) {
        setCurrentView('dashboard');
      } else {
        setAuthMode('login');
        setAuthRole('farmer');
        setShowAuthModal(true);
      }
    } else if (path === '/staff') {
      if (user) {
        setCurrentView('dashboard');
      } else {
        setAuthMode('login');
        setAuthRole('staff');
        setShowAuthModal(true);
      }
    } else if (path === '/admin') {
      if (user) {
        setCurrentView('dashboard');
      } else {
        setAuthMode('login');
        setAuthRole('admin');
        setShowAuthModal(true);
      }
    } else {
      if (user) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/live-queue') {
        setCurrentView('public-board');
      } else {
        setCurrentView(user ? 'dashboard' : 'landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // When user logs in, push correct URL
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
      setShowAuthModal(false);
      const targetPath = `/${user.role}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  }, [user]);

  const fetchGlobalData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Services
      const svcRes = await safeFetchJson<ServiceItem[]>('/api/tokens/services');
      if (svcRes.ok && Array.isArray(svcRes.data)) {
        setServices(svcRes.data);
      }

      // 2. Live Queue
      const queueRes = await safeFetchJson<{
        waitingCount?: number;
        servingCount?: number;
        dbStatus?: { type: string };
      }>('/api/tokens/live-queue');
      if (queueRes.ok && queueRes.data) {
        const wc = queueRes.data.waitingCount || 0;
        setWaitingCount(wc);
        setServingCount(queueRes.data.servingCount || 0);
        setDbType(queueRes.data.dbStatus?.type || 'mongodb');
        setEstimatedWaitMinutes(Math.max(5, wc * 8));
      }
    } catch (err) {
      console.warn('Notice: Background queue sync retry pending:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register', role: UserRole = 'farmer', serviceId?: string) => {
    setAuthMode(mode);
    setAuthRole(role);
    if (serviceId) {
      setPreselectedServiceId(serviceId);
    }
    setShowAuthModal(true);
  };

  const handleNavigateSection = (sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSwitchToLiveBoard = () => {
    setCurrentView('public-board');
    window.history.pushState({}, '', '/live-queue');
  };

  const handleExitLiveBoard = () => {
    if (user) {
      setCurrentView('dashboard');
      window.history.pushState({}, '', `/${user.role}`);
    } else {
      setCurrentView('landing');
      window.history.pushState({}, '', '/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Initializing Kisan Queue System...</p>
        </div>
      </div>
    );
  }

  // Fullscreen Public Display Board view
  if (currentView === 'public-board') {
    return <PublicDisplayBoard onBack={handleExitLiveBoard} />;
  }

  return (
    <div className="min-h-screen bg-[#F3F6F4] flex flex-col font-sans text-slate-800 selection:bg-emerald-200">
      {/* Top Header & Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={(v) => {
          if (v === 'public-board') {
            handleSwitchToLiveBoard();
          } else if (v === 'landing' || v === 'dashboard') {
            setCurrentView(v);
          }
        }}
        waitingCount={waitingCount}
        servingCount={servingCount}
        onRefresh={fetchGlobalData}
        isRefreshing={isRefreshing}
        onOpenAuth={(mode) => handleOpenAuth(mode, 'farmer')}
        onOpenProfile={() => setShowProfileModal(true)}
        onNavigateSection={handleNavigateSection}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!user ? (
          /* Professional Government Landing Page for Public Visitors */
          <LandingPage
            services={services}
            waitingCount={waitingCount}
            servingCount={servingCount}
            estimatedWaitMinutes={estimatedWaitMinutes}
            onOpenAuth={(mode, serviceId) => handleOpenAuth(mode, 'farmer', serviceId)}
            onOpenLiveBoard={handleSwitchToLiveBoard}
          />
        ) : (
          /* Role-Based Dashboard for Authenticated Users */
          <div>
            {user.role === 'farmer' && (
              <ErrorBoundary componentName="Farmer Dashboard">
                <FarmerDashboard 
                  services={services} 
                  preselectedServiceId={preselectedServiceId} 
                />
              </ErrorBoundary>
            )}
            {user.role === 'staff' && (
              <ErrorBoundary componentName="Staff Counter Console">
                <StaffDashboard />
              </ErrorBoundary>
            )}
            {user.role === 'admin' && (
              <ErrorBoundary componentName="Admin Management Console">
                <AdminDashboard />
              </ErrorBoundary>
            )}
          </div>
        )}
      </main>

      {/* Auth Modal Overlay when user requests Sign In or Farmer Registration */}
      {showAuthModal && !user && (
        <AuthModal
          initialMode={authMode}
          initialRole={authRole}
          isModalOverlay={true}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(loggedInRole) => {
            setShowAuthModal(false);
            window.history.pushState({}, '', `/${loggedInRole}`);
          }}
        />
      )}

      {/* Profile Modal when user clicks profile in header */}
      {showProfileModal && user && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Government Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Kisan Queue • Krishi Seva Kendra Token & Queue Management System</p>
          <div className="flex items-center space-x-4 text-[11px] font-medium text-slate-400">
            <span>Ministry of Agriculture & Farmers Welfare</span>
            <span>•</span>
            <span>Digital India Initiative</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
