'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import vendorApi from '@/lib/vendorApi';
import { Building2, Users, Briefcase, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Stats {
  total_companies: string;
  active_companies: string;
  trial_companies: string;
  suspended_companies: string;
  total_drivers: string;
  jobs_this_month: string;
  mrr: string;
}

interface Company {
  id: string;
  name: string;
  plan_name: string | null;
  plan_status: string;
  driver_count: string;
  created_at: string;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function VendorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      vendorApi.get('/stats'),
      vendorApi.get('/companies'),
    ]).then(([s, c]) => {
      setStats(s.data);
      setCompanies(c.data.slice(0, 10));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of all customer companies</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Companies" value={stats.total_companies} icon={Building2} color="bg-blue-100 text-blue-600" />
          <StatCard label="Active" value={stats.active_companies} icon={CheckCircle} color="bg-green-100 text-green-600" />
          <StatCard label="On Trial" value={stats.trial_companies} icon={Clock} color="bg-yellow-100 text-yellow-600" />
          <StatCard label="Suspended" value={stats.suspended_companies} icon={AlertCircle} color="bg-red-100 text-red-600" />
          <StatCard label="Total Drivers" value={stats.total_drivers} icon={Users} color="bg-purple-100 text-purple-600" />
          <StatCard label="Jobs This Month" value={stats.jobs_this_month} icon={Briefcase} color="bg-indigo-100 text-indigo-600" />
          <StatCard label="MRR" value={`$${Number(stats.mrr).toLocaleString()}`} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
        </div>
      )}

      {/* Recent companies */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Companies</h2>
          <Link href="/vendor/companies" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Company</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Plan</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Drivers</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/vendor/companies/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.plan_name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[c.plan_status] || 'bg-gray-100 text-gray-800'}`}>
                      {c.plan_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.driver_count}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && (
            <p className="text-center text-gray-400 py-8">No companies yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
