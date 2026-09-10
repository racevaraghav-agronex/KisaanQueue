import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { UserRole } from '../types.ts';
import { 
  normalizeIndianMobile, 
  isValidEmail, 
  MOBILE_ERROR_MESSAGE, 
  EMAIL_ERROR_MESSAGE 
} from '../utils/validators.ts';
import { 
  X, 
  Sprout, 
  Tractor, 
  Building2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  LogIn,
  UserPlus
} from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  onSuccess?: (role: UserRole) => void;
  onClose?: () => void;
  isModalOverlay?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  initialRole = 'farmer',
  onSuccess,
  onClose,
  isModalOverlay = false
}) => {
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const [viewMode, setViewMode] = useState<'signin' | 'register'>(
    initialMode === 'register' ? 'register' : 'signin'
  );

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  // Farmer login
  const [farmerIdentifier, setFarmerIdentifier] = useState('');
  const [farmerPassword, setFarmerPassword] = useState('');

  // Staff login
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Admin login
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Farmer Registration
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setViewMode(initialMode === 'register' ? 'register' : 'signin');
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialMode, initialRole]);

  const handleLoginSubmit = async (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    let credential = '';
    let pwd = '';

    if (role === 'farmer') {
      credential = farmerIdentifier.trim();
      pwd = farmerPassword;
    } else if (role === 'staff') {
      credential = staffEmail.trim();
      pwd = staffPassword;
    } else {
      credential = adminEmail.trim();
      pwd = adminPassword;
    }

    if (!credential || !pwd) {
      setErrorMsg('Please enter both your credentials and password.');
      setSubmitting(false);
      return;
    }

    const res = await login(credential, pwd);
    setSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed. Please verify credentials.');
    } else if (res.user) {
      if (onSuccess) {
        onSuccess(res.user.role);
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    const normalizedPhone = normalizeIndianMobile(regPhone);
    if (!normalizedPhone) {
      setErrorMsg(MOBILE_ERROR_MESSAGE);
      return;
    }

    const cleanEmail = regEmail.trim();
    if (!isValidEmail(cleanEmail, false)) {
      setErrorMsg(EMAIL_ERROR_MESSAGE);
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const res = await register({
      name: regName.trim(),
      email: cleanEmail,
      phone: normalizedPhone,
      password: regPassword,
      confirmPassword: regConfirmPassword
    });
    setSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed.');
    } else if (res.user) {
      if (onSuccess) {
        onSuccess(res.user.role);
      }
    }
  };

  // Quick fill helper for effortless testing
  const quickFillCredentials = (role: UserRole) => {
    setErrorMsg(null);
    if (role === 'farmer') {
      setSelectedRole('farmer');
      setViewMode('signin');
      setFarmerIdentifier('9876543210');
      setFarmerPassword('farmer123');
    } else if (role === 'staff') {
      setSelectedRole('staff');
      setViewMode('signin');
      setStaffEmail('staff@kisanqueue.com');
      setStaffPassword('staff123');
    } else if (role === 'admin') {
      setSelectedRole('admin');
      setViewMode('signin');
      setAdminEmail('admin@kisanqueue.com');
      setAdminPassword('Admin@123');
    }
  };

  const formContent = (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden relative transition-all animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header with subtle gradient */}
      <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 relative border-b border-emerald-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
              <Sprout className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-black tracking-tight font-heading text-white">
                  {t('app.title', 'KISAN QUEUE')}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t('auth.portal', 'Portal')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t('app.subtitle', 'Krishi Seva Kendra Token & Billing Desk')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <LanguageSelector />
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* View Mode Pill Toggle */}
        <div className="mt-5 grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300">
          <button
            type="button"
            onClick={() => {
              setViewMode('signin');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              viewMode === 'signin'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold shadow-md'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('auth.signIn', 'Sign In')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('register');
              setSelectedRole('farmer');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              viewMode === 'register'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold shadow-md'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('auth.register', 'Farmer Register')}</span>
          </button>
        </div>
      </div>

      {/* Role Selection Tabs (Only during Sign In) */}
      {viewMode === 'signin' && (
        <div className="p-3 bg-slate-50 border-b border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
            <span>{t('auth.roleSelect', 'Select Account Role')}</span>
            <span className="text-[10px] text-emerald-700 font-semibold lowercase">
              click below to switch
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="role-tab-farmer"
              type="button"
              onClick={() => {
                setSelectedRole('farmer');
                setErrorMsg(null);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                selectedRole === 'farmer'
                  ? 'border-emerald-600 bg-white text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500/20'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white hover:border-slate-300'
              }`}
            >
              <Tractor className={`w-4 h-4 ${selectedRole === 'farmer' ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span className="text-xs font-semibold">{t('auth.farmer', 'Farmer')}</span>
              <span className="text-[9px] text-slate-400 font-normal">टोकन</span>
            </button>

            <button
              id="role-tab-staff"
              type="button"
              onClick={() => {
                setSelectedRole('staff');
                setErrorMsg(null);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                selectedRole === 'staff'
                  ? 'border-emerald-600 bg-white text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500/20'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white hover:border-slate-300'
              }`}
            >
              <Building2 className={`w-4 h-4 ${selectedRole === 'staff' ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span className="text-xs font-semibold">{t('auth.staff', 'Staff')}</span>
              <span className="text-[9px] text-slate-400 font-normal">काउंटर</span>
            </button>

            <button
              id="role-tab-admin"
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setErrorMsg(null);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                selectedRole === 'admin'
                  ? 'border-emerald-600 bg-white text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500/20'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white hover:border-slate-300'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span className="text-xs font-semibold">{t('auth.admin', 'Admin')}</span>
              <span className="text-[9px] text-slate-400 font-normal">अधीक्षक</span>
            </button>
          </div>
        </div>
      )}

      {/* Form Content Area */}
      <div className="p-6 space-y-4">
        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. FARMER SIGN IN */}
        {viewMode === 'signin' && selectedRole === 'farmer' && (
          <form onSubmit={(e) => handleLoginSubmit(e, 'farmer')} className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Farmer Login
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Access your digital queue tokens and service receipt
              </p>
            </div>

            {/* Quick Demo Pill */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
              <span className="text-emerald-900 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                Demo Credentials:
              </span>
              <button
                type="button"
                onClick={() => quickFillCredentials('farmer')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
              >
                {t('auth.demoBtn', 'Auto-fill Demo')}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('auth.mobileOrEmail', 'Mobile Number or Email')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="farmer-login-mobile"
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={farmerIdentifier}
                  onChange={(e) => setFarmerIdentifier(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t('auth.password', 'Password')}
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="farmer-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={farmerPassword}
                  onChange={(e) => setFarmerPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="farmer-signin-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-800/20 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t('auth.signInBtn', 'Sign In as Farmer')}</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-600">
              {t('auth.newFarmer', 'New farmer to Kendra?')}{' '}
              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  setErrorMsg(null);
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {t('auth.registerNow', 'Register for Free Token')}
              </button>
            </div>
          </form>
        )}

        {/* 2. FARMER REGISTRATION */}
        {viewMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                {t('auth.register', 'Farmer Registration')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Register once to generate and track tokens digitally
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('auth.fullName', 'Full Name')} *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('farmer.phoneLabel', 'Mobile')} *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="farmer@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('auth.password', 'Password')} *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 chars"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('auth.confirmPassword', 'Confirm Password')} *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              id="farmer-register-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-800/20 flex items-center justify-center space-x-2 mt-2"
            >
              {submitting ? (
                <span>Registering...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{t('auth.registerBtn', 'Register & Get Digital Token')}</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-600">
              {t('auth.alreadyAccount', 'Already registered?')}{' '}
              <button
                type="button"
                onClick={() => {
                  setViewMode('signin');
                  setSelectedRole('farmer');
                  setErrorMsg(null);
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. STAFF SIGN IN */}
        {viewMode === 'signin' && selectedRole === 'staff' && (
          <form onSubmit={(e) => handleLoginSubmit(e, 'staff')} className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Staff Counter Terminal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized Krishi Seva Kendra counter operator login
              </p>
            </div>

            {/* Quick Demo Pill */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-sky-50/80 border border-sky-200 text-xs">
              <span className="text-sky-900 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-sky-600" />
                Staff Demo:
              </span>
              <button
                type="button"
                onClick={() => quickFillCredentials('staff')}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
              >
                Auto-fill Demo
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Staff Official Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="staff-login-email"
                  type="text"
                  required
                  placeholder="staff@kisanqueue.gov.in"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Terminal Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="staff-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="staff-signin-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-sky-700 to-sky-900 hover:from-sky-800 hover:to-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-sky-800/20 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Authenticating Counter...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Counter Terminal</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 4. ADMIN SIGN IN */}
        {viewMode === 'signin' && selectedRole === 'admin' && (
          <form onSubmit={(e) => handleLoginSubmit(e, 'admin')} className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Admin Console
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Administrative governance, counter assignment & supervisor desk
              </p>
            </div>

            {/* Quick Demo Pill */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-300 text-xs">
              <span className="text-slate-800 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Admin Demo:
              </span>
              <button
                type="button"
                onClick={() => quickFillCredentials('admin')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-black text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
              >
                Auto-fill Demo
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin Username / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="admin-login-email"
                  type="text"
                  required
                  placeholder="admin@kisanqueue.gov.in"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-signin-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-slate-900 to-slate-950 hover:bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-slate-900/30 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Verifying Authority...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sign In to Admin Console</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (isModalOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        {formContent}
      </div>
    );
  }

  return (
    <div className="py-8 flex items-center justify-center px-4">
      {formContent}
    </div>
  );
};
