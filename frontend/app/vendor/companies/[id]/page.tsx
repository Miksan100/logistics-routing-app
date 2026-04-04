'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import vendorApi from '@/lib/vendorApi';
import { ArrowLeft, Save, Power, PowerOff, Plus, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface Plan { id: string; name: string; price_monthly: number; }
interface CompanyDetail {
  company: any;
  users: any[];
  stats: any;
}

const statusColors: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [planStatus, setPlanStatus] = useState('trial');
  const [msg, setMsg] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [billingType, setBillingType] = useState('monthly');
  const [billingAmount, setBillingAmount] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const toggleReveal = (userId: string) => setRevealedPasswords(prev => {
    const next = new Set(prev);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    return next;
  });
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', adminIdNumber: '' });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');

  useEffect(() => {
    Promise.all([
      vendorApi.get(`/companies/${id}`),
      vendorApi.get('/plans'),
    ]).then(([d, p]) => {
      setDetail(d.data);
      setPlans(p.data);
      setNotes(d.data.company.notes || '');
      setSelectedPlan(d.data.company.plan_id || '');
      setPlanStatus(d.data.company.plan_status || 'trial');
      setBillingType(d.data.company.billing_type || 'monthly');
      setBillingAmount(d.data.company.billing_amount ?? '');
    }).catch((err: any) => {
      setFetchError(err.response?.data?.error || err.message || 'Failed to load company');
    }).finally(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await vendorApi.patch(`/companies/${id}/notes`, { notes });
      setMsg('Notes saved');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      await vendorApi.patch(`/companies/${id}/plan`, { planId: selectedPlan || null, planStatus });
      setMsg('Plan status updated');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const saveBilling = async () => {
    setSaving(true);
    try {
      await vendorApi.patch(`/companies/${id}/billing`, {
        billingType,
        billingAmount: billingAmount !== '' ? billingAmount : null,
        ...(billingType === 'monthly' && { planId: selectedPlan || null }),
      });
      setMsg('Billing info saved');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const setA = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAdminForm(f => ({ ...f, [k]: e.target.value }));

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminError('');
    setAddingAdmin(true);
    try {
      await vendorApi.post(`/companies/${id}/admins`, adminForm);
      setMsg('Admin added and welcome email sent');
      setShowAddAdmin(false);
      setAdminForm({ adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', adminIdNumber: '' });
      // Refresh users list
      const { data } = await vendorApi.get(`/companies/${id}`);
      setDetail(d => d ? { ...d, users: data.users } : d);
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setAddAdminError(err.response?.data?.error || 'Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const enterAdminPortal = async () => {
    // Open the window synchronously (before await) to avoid popup blockers
    const newTab = window.open('', '_blank');
    if (!newTab) return;
    setImpersonating(true);
    try {
      const { data } = await vendorApi.post(`/companies/${id}/impersonate`);
      const userEncoded = btoa(JSON.stringify(data.user));
      newTab.location.href = `/impersonate?token=${encodeURIComponent(data.token)}&user=${encodeURIComponent(userEncoded)}`;
    } catch (err: any) {
      newTab.close();
      setMsg(err.response?.data?.error || 'Failed to access admin portal');
      setTimeout(() => setMsg(''), 4000);
    } finally {
      setImpersonating(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentlyActive: boolean) => {
    try {
      await vendorApi.patch(`/companies/${id}/admins/${userId}/status`, { isActive: !currentlyActive });
      setMsg(currentlyActive ? 'Admin terminated' : 'Admin reactivated');
      const { data } = await vendorApi.get(`/companies/${id}`);
      setDetail(d => d ? { ...d, users: data.users } : d);
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to update admin status');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const toggleStatus = async () => {
    if (!detail) return;
    const newActive = !detail.company.is_active;
    await vendorApi.patch(`/companies/${id}/status`, { isActive: newActive });
    setDetail({ ...detail, company: { ...detail.company, is_active: newActive } });
    setMsg(newActive ? 'Company activated' : 'Company suspended');
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
  if (fetchError) return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{fetchError}</div>
    </div>
  );
  if (!detail) return null;

  const { company, users, stats } = detail;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {msg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{msg}</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{company.billing_email}</p>
          <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[company.plan_status] || 'bg-gray-100 text-gray-800'}`}>
            {company.plan_status}
          </span>
          {!company.is_active && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspended</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={enterAdminPortal}
            disabled={impersonating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Enter Admin Portal
          </button>
          <button
            onClick={toggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              company.is_active
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {company.is_active ? <><PowerOff className="w-4 h-4" /> Suspend</> : <><Power className="w-4 h-4" /> Activate</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Jobs', value: stats.total_jobs },
          { label: 'Completed Jobs', value: stats.completed_jobs },
          { label: 'Jobs This Month', value: stats.jobs_this_month },
          { label: 'Active Drivers', value: stats.active_drivers },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Subscription Plan</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Plan Status</label>
              <select value={planStatus} onChange={(e) => setPlanStatus(e.target.value)} className="input-field">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={savePlan}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Save className="w-4 h-4" />
              Save Status
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Internal Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="input-field resize-none"
            placeholder="Add notes about this customer…"
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-3 btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Save className="w-4 h-4" />
            Save Notes
          </button>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Billing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Billing Type</label>
            <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className="input-field">
              <option value="monthly">Monthly</option>
              <option value="once_off">Once-off</option>
            </select>
          </div>

          {billingType === 'monthly' && (
            <div>
              <label className="label">Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="input-field"
              >
                <option value="">— No plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — R{p.price_monthly}/mo</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">
              {billingType === 'monthly' ? 'Custom Amount (R) — overrides plan price' : 'Amount (R)'}
            </label>
            <input
              type="number"
              value={billingAmount}
              onChange={(e) => setBillingAmount(e.target.value)}
              className="input-field"
              min="0"
              step="0.01"
              placeholder={billingType === 'monthly' ? 'Leave blank to use plan price' : '0.00'}
            />
          </div>
        </div>
        <button
          onClick={saveBilling}
          disabled={saving}
          className="mt-4 btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Save className="w-4 h-4" />
          Save Billing
        </button>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Admin Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Last Login</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Password</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3 capitalize text-gray-600">{u.role}</td>
                  <td className="px-5 py-3 text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-700">
                        {revealedPasswords.has(u.id) ? (u.plain_password || '—') : '••••••••'}
                      </span>
                      {u.plain_password && (
                        <button onClick={() => toggleReveal(u.id)} className="text-gray-400 hover:text-gray-600">
                          {revealedPasswords.has(u.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Terminated'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleAdminStatus(u.id, u.is_active)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        u.is_active
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {u.is_active ? 'Terminate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center text-gray-400 py-8">No users</p>}
        </div>
      </div>

      {/* Add Admin */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Admin Users ({users.length}/10)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Up to 10 admins per company</p>
          </div>
          {users.filter((u: any) => u.role === 'admin').length < 10 && (
            <button
              onClick={() => setShowAddAdmin(v => !v)}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Admin
            </button>
          )}
        </div>

        {showAddAdmin && (
          <form onSubmit={handleAddAdmin} className="border-t border-gray-100 pt-4 space-y-4">
            {addAdminError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{addAdminError}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input type="text" value={adminForm.adminFirstName} onChange={setA('adminFirstName')} className="input-field" required />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input type="text" value={adminForm.adminLastName} onChange={setA('adminLastName')} className="input-field" required />
              </div>
              <div className="col-span-2">
                <label className="label">Email</label>
                <input type="email" value={adminForm.adminEmail} onChange={setA('adminEmail')} className="input-field" required />
              </div>
              <div className="col-span-2">
                <label className="label">Password</label>
                <input type="text" value={adminForm.adminPassword} onChange={setA('adminPassword')} className="input-field" required minLength={8} />
              </div>
              <div className="col-span-2">
                <label className="label">ID Number / Passport Number</label>
                <input type="text" value={adminForm.adminIdNumber} onChange={setA('adminIdNumber')} className="input-field" required placeholder="Used to protect the credentials PDF" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={addingAdmin} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                {addingAdmin && <Loader2 className="w-4 h-4 animate-spin" />}
                {addingAdmin ? 'Adding...' : 'Add Admin & Send Email'}
              </button>
              <button type="button" onClick={() => setShowAddAdmin(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
