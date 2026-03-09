'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import vendorApi from '@/lib/vendorApi';
import { Search, Plus } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  plan_name: string | null;
  plan_status: string;
  is_active: boolean;
  driver_count: string;
  admin_count: string;
  job_count: string;
  billing_email: string | null;
  created_at: string;
  trial_ends_at: string | null;
}

const STATUS_TABS = ['all', 'trial', 'active', 'suspended', 'cancelled'];

const statusColors: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (activeTab !== 'all') params.status = activeTab;
      const { data } = await vendorApi.get('/companies', { params });
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 text-sm mt-1">{companies.length} total</p>
        </div>
        <Link href="/vendor/companies/new" className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <Plus className="w-4 h-4" />
          New Company
        </Link>
      </div>

      {/* Search + Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="input-field pl-9"
            />
          </div>
        </div>
        <div className="flex gap-1 px-4 pt-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-t text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Company</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Plan</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Drivers</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Jobs</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/vendor/companies/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      {c.billing_email && <p className="text-xs text-gray-400">{c.billing_email}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.plan_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[c.plan_status] || 'bg-gray-100 text-gray-700'}`}>
                        {c.plan_status}
                      </span>
                      {!c.is_active && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">disabled</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.driver_count}</td>
                    <td className="px-5 py-3 text-gray-600">{c.job_count}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {companies.length === 0 && (
              <p className="text-center text-gray-400 py-12">No companies found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
