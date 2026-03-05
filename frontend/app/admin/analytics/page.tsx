'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import { Loader2, TrendingUp, Users, Truck } from 'lucide-react';

interface DriverRow { id: string; first_name: string; last_name: string; total_jobs: string; completed: string; cancelled: string; completion_rate: string; }
interface VehicleRow { id: string; registration_number: string; make: string; model: string; total_jobs: string; completed_jobs: string; total_distance_km: string; }

function RangeSelector({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="input-field w-36 text-sm" />
      <span className="text-gray-400">to</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="input-field w-36 text-sm" />
    </div>
  );
}

export default function AnalyticsPage() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 8) + '01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [jobStats, setJobStats] = useState<any>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [fleet, setFleet] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [j, d, f] = await Promise.all([
        analyticsApi.jobAnalytics(from, to),
        analyticsApi.driverProductivity(from, to),
        analyticsApi.fleetUsage(from, to),
      ]);
      setJobStats(j); setDrivers(d); setFleet(f);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Analytics</h1></div>
        <RangeSelector from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-6">
          {/* Job Overview */}
          {jobStats && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Job Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Total', value: jobStats.total, color: 'text-gray-900' },
                  { label: 'Completed', value: jobStats.completed, color: 'text-green-600' },
                  { label: 'Cancelled', value: jobStats.cancelled, color: 'text-red-600' },
                  { label: 'Pending', value: jobStats.pending, color: 'text-gray-500' },
                  { label: 'Completion %', value: (jobStats.completion_rate || 0) + '%', color: 'text-blue-600' },
                  { label: 'Cancellation %', value: (jobStats.cancellation_rate || 0) + '%', color: 'text-orange-600' },
                ].map((s) => (
                  <div key={s.label} className="card text-center">
                    <p className={'text-2xl font-bold ' + s.color}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Driver Productivity */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Driver Productivity
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Driver</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Total</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Completed</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Cancelled</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Rate</th>
                </tr></thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium">{d.first_name} {d.last_name}</td>
                      <td className="py-2.5 px-3 text-right">{d.total_jobs}</td>
                      <td className="py-2.5 px-3 text-right text-green-600">{d.completed}</td>
                      <td className="py-2.5 px-3 text-right text-red-500">{d.cancelled}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-blue-600">{d.completion_rate || 0}%</td>
                    </tr>
                  ))}
                  {!drivers.length && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fleet Usage */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Fleet Usage
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Vehicle</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Jobs</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Completed</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Distance (km)</th>
                </tr></thead>
                <tbody>
                  {fleet.map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium">{v.registration_number} <span className="text-gray-400 font-normal">{v.make} {v.model}</span></td>
                      <td className="py-2.5 px-3 text-right">{v.total_jobs}</td>
                      <td className="py-2.5 px-3 text-right text-green-600">{v.completed_jobs}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{Number(v.total_distance_km).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!fleet.length && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
