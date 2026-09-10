import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { Sprout, Monitor, LogOut, LogIn, UserPlus, Sparkles, UserCheck } from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'dashboard' | 'public-board' | 'auth';
  setCurrentView: (view: 'landing' | 'dashboard' | 'public-board' | 'auth') => void;
  waitingCount: number;
  servingCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile?: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  waitingCount,
  servingCount,
  onOpenAuth,
  onOpenProfile,
  onNavigateSection
}) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const handleNavClick = (sectionId: string) => {
    if (user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('landing');
    }

    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur-md text-white flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-emerald-900/50 sticky top-0 z-50 transition-all shadow-md">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <div 
            className="flex items-center gap-3 cursor-pointer group select-none" 
            onClick={() => {
              if (user) {
                setCurrentView('dashboard');
              } else {
                setCurrentView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/40 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-200">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight font-heading text-white">
                  {t('app.title', 'KISAN QUEUE')}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('auth.portal', 'Kendra Portal')}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                {t('app.subtitle', 'Digital Tokens • Billing • Inventory')}
              </span>
            </div>
          </div>

          {/* Navigation links: Services, How It Works, Live Queue */}
          <nav className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-slate-300">
            <button
              onClick={() => handleNavClick('services-section')}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              {t('nav.services', 'Services')}
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              {t('nav.howItWorks', 'How It Works')}
            </button>
            <button
              id="nav-live-queue-link"
              onClick={() => setCurrentView('public-board')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                currentView === 'public-board'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              <div className="relative">
                <Monitor className="w-3.5 h-3.5" />
                {servingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span>{t('nav.liveQueue', 'Live Queue')}</span>
              {(waitingCount > 0 || servingCount > 0) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono text-amber-300 ml-1">
                  {servingCount} {t('nav.active', 'active')}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right Section: Language Selector + Auth or Logged In User State */}
        <div className="flex items-center gap-2.5">
          {/* Multi-Language Selector Dropdown */}
          <LanguageSelector />

          {user ? (
            /* Logged In State */
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shadow-xs ${
                  currentView === 'dashboard'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                {user.role === 'admin' ? t('nav.adminPanel', 'Admin Panel') : user.role === 'staff' ? `Counter 0${user.counterNumber || 1}` : t('nav.myDesk', 'My Token Desk')}
              </button>

              <div 
                onClick={onOpenProfile}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 cursor-pointer transition-colors"
                title={t('nav.profile', 'View Profile')}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-white truncate max-w-[110px]">{user.name}</span>
                  <span className="text-[10px] text-emerald-400 capitalize flex items-center gap-0.5">
                    <UserCheck className="w-2.5 h-2.5" />
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                id="user-logout-btn"
                onClick={logout}
                className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white p-2 rounded-lg transition-colors cursor-pointer border border-slate-700 hover:border-rose-500"
                title={t('nav.signOut', 'Sign Out')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Unauthenticated Visitor State */
            <div className="flex items-center gap-2">
              <button
                id="nav-signin-btn"
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('nav.signIn', 'Sign In')}</span>
              </button>

              <button
                id="nav-register-btn"
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-300 hover:from-emerald-300 hover:to-emerald-200 rounded-lg shadow-sm hover:shadow-emerald-500/20 transition-all flex items-center space-x-1.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-950" />
                <span>{t('nav.getToken', 'Get Token')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
