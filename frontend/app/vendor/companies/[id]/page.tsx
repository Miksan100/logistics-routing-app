'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import vendorApi from '@/lib/vendorApi';
import { ArrowLeft, Save, Power, PowerOff } from 'lucide-react';

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
    if (!selectedPlan) return;
    setSaving(true);
    try {
      await vendorApi.patch(`/companies/${id}/plan`, { planId: selectedPlan, planStatus });
      setMsg('Plan updated');
    } finally {
      setSaving(false);
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
              <label className="label">Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="input-field"
              >
                <option value="">— No plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>
                ))}
              </select>
            </div>
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
              disabled={saving || !selectedPlan}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Save className="w-4 h-4" />
              Save Plan
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
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center text-gray-400 py-8">No users</p>}
        </div>
      </div>
    </div>
  );
}
