'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import type { DashboardStats } from '@/types';
import { Briefcase, CheckCircle, Clock, XCircle, Users, Truck, AlertCircle, Loader2, Activity } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi.dashboard()
      .then(setStats)
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5" />{error}
      </div>
    </div>
  );

  const j = stats?.jobs;
  const d = stats?.drivers;
  const v = stats?.vehicles;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {/* All-time job stats */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">All Jobs</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total" value={j?.total || 0} icon={<Briefcase className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
          <StatCard title="Active" value={j?.active || 0} icon={<Activity className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" subtitle="pending + in progress" />
          <StatCard title="Completed" value={j?.completed || 0} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" />
          <StatCard title="In Progress" value={j?.in_progress || 0} icon={<Clock className="w-5 h-5 text-yellow-600" />} color="bg-yellow-50" />
          <StatCard title="Pending" value={j?.pending || 0} icon={<AlertCircle className="w-5 h-5 text-gray-500" />} color="bg-gray-100" />
          <StatCard title="Cancelled" value={j?.cancelled || 0} icon={<XCircle className="w-5 h-5 text-red-600" />} color="bg-red-50" />
        </div>
      </div>

      {/* Today's summary */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Today's Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Scheduled Today" value={j?.total_today || 0} icon={<Briefcase className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
          <StatCard title="Completed Today" value={j?.completed_today || 0} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" />
          <StatCard title="Active Today" value={j?.active_today || 0} icon={<Activity className="w-5 h-5 text-yellow-600" />} color="bg-yellow-50" />
        </div>
      </div>

      {/* Fleet & Driver Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Drivers</h3>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{d?.active_drivers || 0}</p>
              <p className="text-sm text-gray-500">Active today</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-400">{d?.total_drivers || 0}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: d?.total_drivers ? `${(Number(d.active_drivers) / Number(d.total_drivers)) * 100}%` : '0%' }} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Fleet</h3>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{v?.active_vehicles || 0}</p>
              <p className="text-sm text-gray-500">In use today</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-400">{v?.total_vehicles || 0}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: v?.total_vehicles ? `${(Number(v.active_vehicles) / Number(v.total_vehicles)) * 100}%` : '0%' }} />
          </div>
        </div>
      </div>

      {Number(j?.total_today) > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Overall Completion Rate for Today</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-100 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                style={{ width: `${Math.round((Number(j.completed_today) / Number(j.total_today)) * 100)}%` }}
              >
                <span className="text-xs font-bold text-white">
                  {Math.round((Number(j.completed_today) / Number(j.total_today)) * 100)}%
                </span>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-600">{j.completed_today}/{j.total_today} jobs</span>
          </div>
        </div>
      )}
    </div>
  );
}
