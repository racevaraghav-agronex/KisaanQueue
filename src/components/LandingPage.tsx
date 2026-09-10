import React from 'react';
import { ServiceItem } from '../types.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { 
  Sprout, 
  Clock, 
  Monitor, 
  Ticket, 
  FileText, 
  CreditCard, 
  Shield, 
  Tractor, 
  ArrowRight,
  LogIn,
  CheckCircle2,
  Sparkles,
  Users,
  ChevronRight,
  ShieldCheck,
  Building2,
  CalendarCheck
} from 'lucide-react';

interface LandingPageProps {
  services: ServiceItem[];
  waitingCount: number;
  servingCount: number;
  estimatedWaitMinutes: number;
  onOpenAuth: (mode: 'login' | 'register', preselectedServiceId?: string) => void;
  onOpenLiveBoard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  services,
  waitingCount,
  servingCount,
  estimatedWaitMinutes,
  onOpenAuth,
  onOpenLiveBoard
}) => {
  const { t } = useLanguage();

  const getServiceMeta = (codeOrId?: string, fallbackId?: string) => {
    const raw = `${codeOrId || ''} ${fallbackId || ''}`.toLowerCase();
    if (raw.includes('fert') || raw.includes('seed') || raw.includes('fs')) {
      return {
        icon: <Sprout className="w-5 h-5 text-emerald-600" />,
        bg: 'bg-emerald-50 border-emerald-100',
        badgeBg: 'bg-emerald-100 text-emerald-800'
      };
    }
    if (raw.includes('gov') || raw.includes('pmksy') || raw.includes('scheme')) {
      return {
        icon: <Shield className="w-5 h-5 text-blue-600" />,
        bg: 'bg-blue-50 border-blue-100',
        badgeBg: 'bg-blue-100 text-blue-800'
      };
    }
    if (raw.includes('soil') || raw.includes('test') || raw.includes('st')) {
      return {
        icon: <FileText className="w-5 h-5 text-amber-600" />,
        bg: 'bg-amber-50 border-amber-100',
        badgeBg: 'bg-amber-100 text-amber-800'
      };
    }
    if (raw.includes('loan') || raw.includes('kcc') || raw.includes('fin')) {
      return {
        icon: <CreditCard className="w-5 h-5 text-indigo-600" />,
        bg: 'bg-indigo-50 border-indigo-100',
        badgeBg: 'bg-indigo-100 text-indigo-800'
      };
    }
    if (raw.includes('mach') || raw.includes('equip') || raw.includes('tract')) {
      return {
        icon: <Tractor className="w-5 h-5 text-orange-600" />,
        bg: 'bg-orange-50 border-orange-100',
        badgeBg: 'bg-orange-100 text-orange-800'
      };
    }
    return {
      icon: <Sprout className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
      badgeBg: 'bg-emerald-100 text-emerald-800'
    };
  };

  return (
    <div className="space-y-10 py-3">
      {/* 1. HERO SECTION WITH MODERN GRADIENT & ACCENTS */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-7 sm:p-10 border border-emerald-800/40 shadow-xl">
        {/* Subtle decorative mesh background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-72 h-72 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-4 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('hero.badge', 'Digital India • Krishi Seva Kendra')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading text-white leading-tight">
            {t('hero.title', 'Digital Queue & Token Management')}
          </h1>

          <p className="text-base sm:text-xl font-medium text-emerald-200 mt-2">
            {t('app.subtitle', 'Instant Counter Slips, Live Queue Screen & Subsidized Agriculture Services')}
          </p>

          <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
            {t('hero.desc', 'Generate your verified digital token in seconds. Check active counter progress directly from your phone and reach the Kendra right on your turn.')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 mt-8">
            <button
              id="hero-get-token-btn"
              onClick={() => onOpenAuth('register')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-emerald-300 hover:from-emerald-300 hover:to-emerald-200 text-slate-950 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center space-x-2.5 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-slate-950" />
              <span>{t('hero.btnToken', 'Get Digital Token')}</span>
              <ArrowRight className="w-4 h-4 text-slate-950 ml-1" />
            </button>

            <button
              id="hero-live-queue-btn"
              onClick={onOpenLiveBoard}
              className="px-5 py-3 bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 hover:border-slate-600 rounded-xl font-semibold text-sm transition-all flex items-center space-x-2.5 cursor-pointer backdrop-blur-xs shadow-sm"
            >
              <Monitor className="w-4 h-4 text-amber-400" />
              <span>{t('hero.btnLive', 'View Public Display Board')}</span>
            </button>

            <button
              id="hero-signin-btn"
              onClick={() => onOpenAuth('login')}
              className="px-4 py-3 text-xs sm:text-sm text-slate-300 hover:text-white font-semibold flex items-center space-x-1.5 cursor-pointer ml-auto sm:ml-0 transition-colors"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>{t('nav.signIn', 'Sign In')}</span>
            </button>
          </div>

          {/* Feature Highlights Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-8 mt-8 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hindi / Regional Audio Calling</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Subsidized Rate Verification</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Counters 01-06 Multi-Desk</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. REALISTIC LIVE STATUS BAR WITH STAT CARDS */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
              {t('board.subtitle', 'Kendra Live Queue Status')}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Auto-syncs every 4s
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Now Serving */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-100">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
              <span>{t('board.nowServing', 'Currently Serving')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight font-heading">
              {servingCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{t('hero.metricCounters', 'Tokens at active counters')}</div>
          </div>

          {/* Waiting */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-100">
            <div className="flex items-center justify-between text-xs text-amber-900 font-semibold mb-1">
              <span>{t('hero.metricWaiting', 'Waiting in Line')}</span>
              <Users className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-3xl font-black text-amber-600 font-mono tracking-tight font-heading">
              {waitingCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{t('farmer.statusWaiting', 'Pending farmer tokens')}</div>
          </div>

          {/* Estimated Wait */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold mb-1">
              <span>{t('hero.metricWait', 'Estimated Wait')}</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight font-heading">
              {waitingCount === 0 ? `0 ${t('common.minutes', 'min')}` : `${estimatedWaitMinutes || 10} ${t('common.minutes', 'min')}`}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Approx. wait for new slip</div>
          </div>

          {/* Kendra Operating Hours */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50/60 to-white border border-sky-100">
            <div className="flex items-center justify-between text-xs text-sky-900 font-semibold mb-1">
              <span>Center Schedule</span>
              <CalendarCheck className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-1 font-mono">
              09:00 AM - 05:00 PM
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Counters Open & Functional</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES SECTION WITH CARD HOVER & VIBRANT BADGES */}
      <section id="services-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-heading">
              {t('nav.services', 'Krishi Services')}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              {t('services.heading', 'Available Counter Services')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('services.subheading', 'Select your required service category to receive an instant queue slip.')}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {services.length} {t('nav.active', 'Services Active')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc, index) => {
            const serviceKey = svc._id || svc.id || svc.code || `svc-item-${index}`;
            const serviceParam = svc.code || svc.id || svc._id || `svc-${index}`;
            const meta = getServiceMeta(svc.code, svc.id);

            return (
              <div
                key={serviceKey}
                className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                        {meta.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-emerald-800 transition-colors">
                          {svc.name}
                        </h3>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${meta.badgeBg}`}>
                          {t('services.tokenPrefix', 'Code')}: {svc.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed min-h-[38px]">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center space-x-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>~{svc.averageMinutes} {t('common.minutes', 'min')}</span>
                  </span>

                  <button
                    id={`get-token-service-${svc.code || svc.id || index}`}
                    onClick={() => onOpenAuth('register', serviceParam)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer group-hover:bg-emerald-700 shadow-xs"
                  >
                    <span>{t('services.bookBtn', 'Get Slip')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-heading">
            Simple Process
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            {t('nav.howItWorks', 'How It Works in 4 Steps')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick, transparent token issuance to minimize waiting crowd at the Kendra.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200/90 text-left relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center mb-3 shadow-xs">
              1
            </div>
            <div className="font-bold text-slate-900 text-sm mb-1 font-heading">{t('farmer.selectService', 'Select Service')}</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pick your requirement (Fertilizer, Seed, Subsidy) and enter your mobile number.
            </p>
          </div>

          <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200/90 text-left relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center mb-3 shadow-xs">
              2
            </div>
            <div className="font-bold text-slate-900 text-sm mb-1 font-heading">{t('farmer.generateNew', 'Digital Token Issued')}</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Receive token slip (e.g. FS-102) with live queue position & estimated wait time.
            </p>
          </div>

          <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200/90 text-left relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center mb-3 shadow-xs">
              3
            </div>
            <div className="font-bold text-slate-900 text-sm mb-1 font-heading">{t('nav.liveQueue', 'Track Real-time')}</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Watch queue movements on your phone or check the Kendra public TV display board.
            </p>
          </div>

          <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200/90 text-left relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center mb-3 shadow-xs">
              4
            </div>
            <div className="font-bold text-slate-900 text-sm mb-1 font-heading">{t('farmer.assignedCounter', 'Counter Assistance')}</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When token is called via voice chime, visit designated Counter 01-06 for your bill.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FOOTER ASSISTANCE BANNER */}
      <section className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 border border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="text-base font-bold font-heading text-white">
            Need help generating your token slip?
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Visit the entrance helpdesk or ask any Kendra representative for immediate assistance.
          </p>
        </div>
        <button
          onClick={() => onOpenAuth('register')}
          className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          {t('hero.btnToken', 'Generate Slip Now')}
        </button>
      </section>
    </div>
  );
};
