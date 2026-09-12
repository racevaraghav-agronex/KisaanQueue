import React, { useState, useEffect } from 'react';
import { User } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  normalizeIndianMobile, 
  isValidEmail, 
  MOBILE_ERROR_MESSAGE, 
  EMAIL_ERROR_MESSAGE 
} from '../../utils/validators.ts';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  X, 
  Monitor, 
  Phone, 
  Mail, 
  Lock, 
  RotateCw,
  Layers,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { StaffRecommendationCard } from './StaffRecommendationCard.tsx';

interface AdminStaffTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminStaffTab: React.FC<AdminStaffTabProps> = ({ token, onNotification }) => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addCounter, setAddCounter] = useState<number>(1);
  const [addCentre, setAddCentre] = useState('Krishi Seva Kendra - Main Centre');
  const [addShiftStatus, setAddShiftStatus] = useState<'active' | 'break' | 'offline'>('active');
  const [addService, setAddService] = useState('Fertilizer & Seed Distribution');
  const [addPassword, setAddPassword] = useState('kisan123');
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCounter, setEditCounter] = useState<number>(1);
  const [editCentre, setEditCentre] = useState('');
  const [editShiftStatus, setEditShiftStatus] = useState<'active' | 'break' | 'offline'>('active');
  const [editService, setEditService] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Confirmation Modal
  const [confirmToggle, setConfirmToggle] = useState<{
    staff: User;
    targetStatus: 'active' | 'inactive';
  } | null>(null);

  // Smart Staff & Counter Recommendation (Batch 8C)
  const [recData, setRecData] = useState<any>(null);
  const [showFullRec, setShowFullRec] = useState<boolean>(false);
  const [loadingRec, setLoadingRec] = useState<boolean>(false);

  const fetchStaffRecs = async () => {
    try {
      setLoadingRec(true);
      const res = await safeFetchJson<any>('/api/admin/recommendations/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setRecData(res.data);
      }
    } catch {
      // Non-blocking background evaluation
    } finally {
      setLoadingRec(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await safeFetchJson<User[]>(`/api/admin/staff?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setStaffList(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load staff list from database.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStaffRecs();
  }, [token]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) {
      setAddError('Full name is required.');
      return;
    }

    const normalizedPhone = normalizeIndianMobile(addPhone);
    if (!normalizedPhone) {
      setAddError(MOBILE_ERROR_MESSAGE);
      return;
    }

    const cleanEmail = addEmail.trim();
    if (!isValidEmail(cleanEmail, false)) {
      setAddError(EMAIL_ERROR_MESSAGE);
      return;
    }

    if (addPassword && addPassword.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await safeFetchJson<{ message?: string; user?: User; error?: string }>('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addName.trim(),
          email: cleanEmail,
          phone: normalizedPhone,
          counterNumber: Number(addCounter),
          assignedService: addService.trim(),
          centre: addCentre.trim() || 'Krishi Seva Kendra - Main Centre',
          shiftStatus: addShiftStatus,
          password: addPassword
        })
      });

      if (res.ok && res.data?.user) {
        onNotification({ type: 'success', text: `Staff member ${res.data.user.name} created successfully!` });
        setShowAddModal(false);
        setAddName('');
        setAddEmail('');
        setAddPhone('');
        setAddCounter(1);
        setAddCentre('Krishi Seva Kendra - Main Centre');
        setAddShiftStatus('active');
        setAddPassword('kisan123');
        fetchStaff();
      } else {
        setAddError(res.error || 'Failed to create staff account.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Network error.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Full name is required.');
      return;
    }

    const normalizedPhone = normalizeIndianMobile(editPhone);
    if (!normalizedPhone) {
      setEditError(MOBILE_ERROR_MESSAGE);
      return;
    }

    try {
      setSubmittingEdit(true);
      const res = await safeFetchJson<{ message?: string; user?: User; error?: string }>(`/api/admin/staff/${editingStaff._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          phone: normalizedPhone,
          counterNumber: Number(editCounter),
          assignedService: editService.trim(),
          centre: editCentre.trim(),
          shiftStatus: editShiftStatus,
          status: editStatus,
          password: editPassword.trim() ? editPassword : undefined
        })
      });

      if (res.ok && res.data?.user) {
        onNotification({ type: 'success', text: `Staff member ${res.data.user.name} updated successfully!` });
        setEditingStaff(null);
        fetchStaff();
      } else {
        setEditError(res.error || 'Failed to update staff member.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    const { staff, targetStatus } = confirmToggle;

    try {
      const res = await safeFetchJson<{ message?: string }>(`/api/admin/staff/${staff._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (res.ok) {
        onNotification({
          type: 'success',
          text: `Staff member ${staff.name} is now ${targetStatus}. History preserved.`
        });
        setConfirmToggle(null);
        fetchStaff();
      } else {
        onNotification({ type: 'error', text: res.error || 'Failed to update staff status' });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error updating status' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Staff & Counter Recommendation Advisory Card (Batch 8C) */}
      {recData && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-xs p-4.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-indigo-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Smart Staff / Counter Recommendation
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    recData.status === 'high_pressure_alert'
                      ? 'bg-rose-100 text-rose-800'
                      : recData.status === 'rebalance_suggested'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {recData.overallAssessment}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5 font-medium">
                  {recData.recommendations?.[0]?.description || recData.executiveSummary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowFullRec(!showFullRec)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{showFullRec ? 'Hide Details' : 'View Pressure Matrix'}</span>
                {showFullRec ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Full Staff Recommendation Card */}
          {showFullRec && (
            <div className="pt-3 border-t border-slate-100">
              <StaffRecommendationCard
                token={token}
                onNotification={onNotification}
              />
            </div>
          )}

          {/* Grounding and Non-Destructive Advisory Reminder */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100/60">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              Advisory only. To reallocate a counter or change shift, click <strong>Edit</strong> on any staff member below.
            </span>
          </div>
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff by name, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setAddError(null);
          }}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff list */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchStaff}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Staff</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading staff directory...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No staff members found</p>
          <p className="text-slate-400 mt-1">Try changing search filters or create a new staff account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((st) => (
            <div
              key={st._id}
              className={`p-5 rounded-2xl border transition-all bg-white ${
                st.status === 'inactive' ? 'border-slate-200 opacity-75' : 'border-slate-200 shadow-xs hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{st.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {st.phone}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {st.email}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    st.status === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {st.status || 'active'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                    st.shiftStatus === 'break'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : st.shiftStatus === 'offline'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      st.shiftStatus === 'break' ? 'bg-amber-500' : st.shiftStatus === 'offline' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
                    }`} />
                    {st.shiftStatus === 'break' ? 'On Break' : st.shiftStatus === 'offline' ? 'Offline' : 'On Duty'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-800 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-200">
                      Counter 0{st.counterNumber || 1}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]" title={st.assignedService}>
                    {st.assignedService || 'General Desk'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{st.centre || 'Krishi Seva Kendra - Main Centre'}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setEditingStaff(st);
                    setEditName(st.name);
                    setEditPhone(st.phone);
                    setEditCounter(st.counterNumber || 1);
                    setEditCentre(st.centre || 'Krishi Seva Kendra - Main Centre');
                    setEditShiftStatus(st.shiftStatus || 'active');
                    setEditService(st.assignedService || '');
                    setEditStatus((st.status as any) || 'active');
                    setEditPassword('');
                    setEditError(null);
                  }}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => setConfirmToggle({
                    staff: st,
                    targetStatus: st.status === 'inactive' ? 'active' : 'inactive'
                  })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    st.status === 'inactive'
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  {st.status === 'inactive' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Activate</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="bg-gradient-to-r from-slate-950 to-emerald-950 text-white p-5 flex items-center justify-between border-b border-emerald-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Register Kendra Staff</h3>
                  <p className="text-[11px] text-emerald-300">Staff accounts are created by Admin only</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-3.5">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Patel"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Indian Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Starts with 6, 7, 8 or 9</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@kisanqueue.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Desk Counter (1-6)</label>
                  <select
                    value={addCounter}
                    onChange={(e) => setAddCounter(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <option key={c} value={c}>Counter 0{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Kendra Centre</label>
                  <input
                    type="text"
                    required
                    placeholder="Centre name"
                    value={addCentre}
                    onChange={(e) => setAddCentre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift / Working Status</label>
                  <select
                    value={addShiftStatus}
                    onChange={(e: any) => setAddShiftStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="active">Active (On Duty)</option>
                    <option value="break">Break (Rest)</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Service Desk</label>
                <input
                  type="text"
                  placeholder="e.g. Fertilizer & Seed Distribution"
                  value={addService}
                  onChange={(e) => setAddService(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submittingAdd ? 'Creating Staff...' : 'Create Staff Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Edit Staff Details</h3>
                  <p className="text-[11px] text-slate-400">{editingStaff.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-5 space-y-3.5">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Counter</label>
                  <select
                    value={editCounter}
                    onChange={(e) => setEditCounter(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <option key={c} value={c}>Counter 0{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Change Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Kendra Centre</label>
                  <input
                    type="text"
                    required
                    value={editCentre}
                    onChange={(e) => setEditCentre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift / Working Status</label>
                  <select
                    value={editShiftStatus}
                    onChange={(e: any) => setEditShiftStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="active">Active (On Duty)</option>
                    <option value="break">Break (Rest)</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Service</label>
                <input
                  type="text"
                  value={editService}
                  onChange={(e) => setEditService(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submittingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-amber-50 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Confirm {confirmToggle.targetStatus === 'active' ? 'Activation' : 'Deactivation'}
            </h4>
            <p className="text-xs text-slate-500 mt-1.5">
              Are you sure you want to mark <strong>{confirmToggle.staff.name}</strong> as <strong>{confirmToggle.targetStatus}</strong>? Historical tokens and sales will remain completely preserved in MongoDB.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleToggleStatus}
                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmToggle(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
