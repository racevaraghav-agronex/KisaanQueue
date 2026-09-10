import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../../types.ts';
import { safeFetchJson } from '../../utils/api.ts';
import { 
  Layers, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  IndianRupee, 
  RotateCw, 
  X, 
  AlertCircle,
  FolderTree,
  Receipt
} from 'lucide-react';

interface AdminServicesTabProps {
  token: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
}

export const AdminServicesTab: React.FC<AdminServicesTabProps> = ({ token, onNotification }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Service Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addCategory, setAddCategory] = useState('Distribution');
  const [addDescription, setAddDescription] = useState('');
  const [addMinutes, setAddMinutes] = useState<number>(10);
  const [addFee, setAddFee] = useState<number>(0);
  const [addRequiresBilling, setAddRequiresBilling] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Service Modal
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMinutes, setEditMinutes] = useState<number>(10);
  const [editFee, setEditFee] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editRequiresBilling, setEditRequiresBilling] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await safeFetchJson<ServiceItem[]>('/api/admin/services', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && Array.isArray(res.data)) {
        setServices(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load services catalog.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error while loading services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) {
      setAddError('Service name is required.');
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await safeFetchJson<{ message?: string; service?: ServiceItem }>('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addName.trim(),
          code: addCode.trim() || undefined,
          category: addCategory.trim(),
          description: addDescription.trim(),
          averageMinutes: Number(addMinutes),
          fee: Number(addFee),
          isActive: true,
          requiresBilling: addRequiresBilling
        })
      });

      if (res.ok && res.data?.service) {
        onNotification({ type: 'success', text: `Service "${res.data.service.name}" created successfully!` });
        setShowAddModal(false);
        setAddName('');
        setAddCode('');
        setAddDescription('');
        setAddMinutes(10);
        setAddFee(0);
        setAddRequiresBilling(false);
        fetchServices();
      } else {
        setAddError(res.error || 'Failed to create service.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Network error.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Service name is required.');
      return;
    }

    try {
      setSubmittingEdit(true);
      const serviceId = editingService._id || editingService.code;
      const res = await safeFetchJson<{ message?: string; service?: ServiceItem }>(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
          description: editDescription.trim(),
          averageMinutes: Number(editMinutes),
          fee: Number(editFee),
          isActive: editIsActive,
          requiresBilling: editRequiresBilling
        })
      });

      if (res.ok && res.data?.service) {
        onNotification({ type: 'success', text: `Service "${res.data.service.name}" updated successfully!` });
        setEditingService(null);
        fetchServices();
      } else {
        setEditError(res.error || 'Failed to update service.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (srv: ServiceItem) => {
    const targetStatus = !(srv.isActive !== false);
    const serviceId = srv._id || srv.code;

    try {
      const res = await safeFetchJson<{ message?: string }>(`/api/admin/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: targetStatus })
      });

      if (res.ok) {
        onNotification({
          type: 'success',
          text: `Service "${srv.name}" is now ${targetStatus ? 'Active' : 'Inactive'}`
        });
        fetchServices();
      } else {
        onNotification({ type: 'error', text: res.error || 'Failed to update service status' });
      }
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error updating status' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Kendra Service Catalog</h3>
          <p className="text-xs text-slate-500">Configure queue services, estimated desk durations, and fees</p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setAddError(null);
          }}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Services Grid */}
      {error && !loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchServices}
            className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Loading Services</span>
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading services catalog...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No services found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => {
            const isActive = srv.isActive !== false;
            return (
              <div
                key={srv._id || srv.code}
                className={`p-5 rounded-2xl border transition-all bg-white flex flex-col justify-between ${
                  !isActive ? 'border-slate-200 opacity-70' : 'border-slate-200 shadow-xs hover:border-emerald-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                        {srv.code || 'SRV'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">{srv.name}</h4>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{srv.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>~{srv.averageMinutes || 10} mins avg</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                      <span>{srv.fee ? `₹${srv.fee}` : 'Free'}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-slate-400">Billing:</span>
                    {srv.requiresBilling ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-amber-600" />
                        Required
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                        Not Required
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setEditingService(srv);
                      setEditName(srv.name);
                      setEditDescription(srv.description || '');
                      setEditCategory(srv.category || 'General');
                      setEditMinutes(srv.averageMinutes || 10);
                      setEditFee(srv.fee || 0);
                      setEditIsActive(srv.isActive !== false);
                      setEditRequiresBilling(Boolean(srv.requiresBilling));
                      setEditError(null);
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(srv)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      !isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    {!isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enable</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Disable</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Add Service</h3>
                  <p className="text-[11px] text-slate-400">Define new queue consultation or assistance service</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-5 space-y-3.5">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Soil Health Card Testing"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SOIL-TEST"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Distribution">Distribution</option>
                    <option value="Advisory">Advisory</option>
                    <option value="Testing">Testing</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Government Scheme">Government Scheme</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Avg Time (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={addMinutes}
                    onChange={(e) => setAddMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={addFee}
                    onChange={(e) => setAddFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Required</label>
                <select
                  value={addRequiresBilling ? 'yes' : 'no'}
                  onChange={(e) => setAddRequiresBilling(e.target.value === 'yes')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="no">No (Billing Optional / Not Required)</option>
                  <option value="yes">Yes (Billing Required Before Completion)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  When set to Yes, calling a token for this service automatically opens billing and requires POS bill completion.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details of the service provided to the farmer..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submittingAdd ? 'Saving...' : 'Create Service'}
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

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Edit Service</h3>
                  <p className="text-[11px] text-slate-400">{editingService.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingService(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="p-5 space-y-3.5">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Avg Time (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editIsActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Required</label>
                <select
                  value={editRequiresBilling ? 'yes' : 'no'}
                  onChange={(e) => setEditRequiresBilling(e.target.value === 'yes')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="no">No (Billing Optional / Not Required)</option>
                  <option value="yes">Yes (Billing Required Before Completion)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  When set to Yes, calling a token for this service automatically opens billing and requires POS bill completion.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : 'Update Service'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
