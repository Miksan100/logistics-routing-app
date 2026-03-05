'use client';
import { useEffect, useState } from 'react';
import { jobsApi, driversApi, vehiclesApi } from '@/lib/api';
import type { Job, Driver, Vehicle } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import JobModal from '@/components/admin/JobModal';
import { Plus, Search, MapPin, Calendar, User, Loader2 } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const [j, d, v] = await Promise.all([jobsApi.list(params), driversApi.list(), vehiclesApi.list()]);
      setJobs(j);
      setDrivers(d.filter((x: Driver) => x.is_active));
      setVehicles(v.filter((x: Vehicle) => x.is_active));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleSave = async (form: Record<string, unknown>) => {
    await jobsApi.create(form);
    load();
  };

  const filtered = jobs.filter((j) =>
    (j.title + ' ' + (j.driver_name || '') + ' ' + j.pickup_address + ' ' + j.delivery_address)
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-1">{jobs.length} jobs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Create Job
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="input-field pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-40">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="started">Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((job) => (
            <div key={job.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{job.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{job.delivery_address}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 sm:text-right sm:flex-col">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(job.scheduled_date).toLocaleDateString()}</span>
                  {job.driver_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{job.driver_name}</span>}
                  {job.registration_number && <span className="font-medium text-gray-700">{job.registration_number}</span>}
                </div>
              </div>
              {job.cancellation_reason && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Cancelled: {job.cancellation_reason}</p>
              )}
            </div>
          ))}
          {!filtered.length && (
            <div className="text-center py-16 text-gray-400">No jobs found.</div>
          )}
        </div>
      )}

      {showModal && (
        <JobModal drivers={drivers} vehicles={vehicles} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  );
}
