import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { normalizeIndianMobile, MOBILE_ERROR_MESSAGE } from '../utils/validators.ts';
import { X, User as UserIcon, Phone, Mail, Shield, CheckCircle2, AlertCircle, Save, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    const normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      setMsg({ type: 'error', text: MOBILE_ERROR_MESSAGE });
      return;
    }

    setSaving(true);
    setMsg(null);
    const res = await updateProfile({ name: name.trim(), phone: normalizedPhone });
    setSaving(false);

    if (!res.success) {
      setMsg({ type: 'error', text: res.error || 'Failed to update profile' });
    } else {
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white p-6 relative border-b border-emerald-800/30">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
              <UserIcon className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-black font-heading tracking-tight text-white">Profile Details</h2>
              <p className="text-xs text-emerald-300 capitalize flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Role: <strong>{user?.role}</strong></span>
                <span>• Krishi Seva Kendra</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {msg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">{msg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none bg-slate-50/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none bg-slate-50/60 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Registered Email (Primary Identity)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 bg-slate-100/80 text-slate-500 rounded-xl text-xs cursor-not-allowed font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Email is locked for official verified security audits.</p>
          </div>

          {user?.role === 'staff' && user?.counterNumber && (
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-emerald-950 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Assigned Counter Desk</span>
              <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                Counter 0{user.counterNumber}
              </span>
            </div>
          )}

          <div className="pt-3 flex gap-2.5">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-800/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
