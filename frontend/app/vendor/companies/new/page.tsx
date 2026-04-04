'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import vendorApi from '@/lib/vendorApi';
import { ArrowLeft, Copy, Check, Loader2 } from 'lucide-react';

interface Plan { id: string; name: string; price_monthly: number; }

interface Credentials {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
  companyId: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    billingEmail: '',
    planId: '',
    planStatus: 'trial',
    adminIdNumber: '',
    billingType: 'monthly',
    billingAmount: '',
  });

  useEffect(() => {
    vendorApi.get('/plans').then(({ data }) => setPlans(data));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await vendorApi.post('/companies', form);
      setCredentials(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const credText = credentials
    ? `Company: ${credentials.companyName}\nLogin URL: ${window.location.origin}/login\nEmail: ${credentials.adminEmail}\nPassword: ${credentials.adminPassword}`
    : '';

  const copyCredentials = () => {
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (credentials) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Company created!</h2>
              <p className="text-sm text-gray-500">Share these credentials with the new customer</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1 mb-4">
            <p><span className="text-gray-500">Company:</span> {credentials.companyName}</p>
            <p><span className="text-gray-500">Login URL:</span> {typeof window !== 'undefined' ? window.location.origin : ''}/login</p>
            <p><span className="text-gray-500">Email:</span> {credentials.adminEmail}</p>
            <p><span className="text-gray-500">Password:</span> {credentials.adminPassword}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyCredentials}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy credentials'}
            </button>
            <button
              onClick={() => router.push('/vendor/companies')}
              className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back to companies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Company</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Company Details</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} className="input-field" required />
            </div>
            <div>
              <label className="label">Billing Email (optional)</label>
              <input type="email" value={form.billingEmail} onChange={set('billingEmail')} className="input-field" placeholder="billing@company.com" />
            </div>
            <div>
              <label className="label">Plan Status</label>
              <select value={form.planStatus} onChange={set('planStatus')} className="input-field">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="label">Billing Type</label>
              <select value={form.billingType} onChange={set('billingType')} className="input-field">
                <option value="monthly">Monthly</option>
                <option value="once_off">Once-off</option>
              </select>
            </div>
            {form.billingType === 'monthly' && (
              <div>
                <label className="label">Plan</label>
                <select value={form.planId} onChange={set('planId')} className="input-field">
                  <option value="">— No plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — R{p.price_monthly}/mo</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">
                {form.billingType === 'monthly' ? 'Custom Amount (R) — overrides plan price' : 'Amount (R)'}
              </label>
              <input
                type="number"
                value={form.billingAmount}
                onChange={set('billingAmount')}
                className="input-field"
                min="0"
                step="0.01"
                placeholder={form.billingType === 'monthly' ? 'Leave blank to use plan price' : '0.00'}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Admin Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input type="text" value={form.adminFirstName} onChange={set('adminFirstName')} className="input-field" required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" value={form.adminLastName} onChange={set('adminLastName')} className="input-field" required />
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input type="email" value={form.adminEmail} onChange={set('adminEmail')} className="input-field" required />
            </div>
            <div className="col-span-2">
              <label className="label">Password</label>
              <input type="text" value={form.adminPassword} onChange={set('adminPassword')} className="input-field" required minLength={8} placeholder="Min. 8 characters" />
            </div>
            <div className="col-span-2">
              <label className="label">ID Number / Passport Number</label>
              <input type="text" value={form.adminIdNumber} onChange={set('adminIdNumber')} className="input-field" required placeholder="Used to protect the credentials PDF" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Creating…' : 'Create Company'}
        </button>
      </form>
    </div>
  );
}
