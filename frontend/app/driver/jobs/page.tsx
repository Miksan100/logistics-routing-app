'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jobsApi } from '@/lib/api';
import type { Job, JobStatus } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import { MapPin, ChevronRight, Loader2, Package } from 'lucide-react';

const TABS: { label: string; statuses: JobStatus[] | 'all' }[] = [
  { label: 'Active', statuses: ['pending', 'started', 'in_progress'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'All', statuses: 'all' },
];

export default function DriverJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    jobsApi.myJobs().then(setJobs).finally(() => setLoading(false));
  }, []);

  const filtered = TABS[tab].statuses === 'all'
    ? jobs
    : jobs.filter((j) => (TABS[tab].statuses as JobStatus[]).includes(j.status));

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Jobs</h1>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === i ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No {TABS[tab].label.toLowerCase()} jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <button
              key={job.id}
              onClick={() => router.push('/driver/jobs/' + job.id)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left flex items-start gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-400">#{job.id.slice(0, 8)}</span>
                  <StatusBadge status={job.status} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </span>
                    <p className="text-sm text-gray-700 truncate">{job.pickup_address}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700 truncate">{job.delivery_address}</p>
                  </div>
                </div>
                {job.scheduled_date && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(job.scheduled_date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 mt-1 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
