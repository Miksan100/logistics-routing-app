'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackingApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { MapPin, Calendar, User, Truck, Route, Loader2, ChevronRight } from 'lucide-react';

export default function JobHistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackingApi.jobHistory()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job History</h1>
        <p className="text-gray-500 text-sm mt-1">Completed and active jobs with route tracking</p>
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => router.push(`/admin/job-history/${job.id}`)}
            className="card cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <StatusBadge status={job.status} />
                  {Number(job.gps_point_count) > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      <Route className="w-3 h-3" />{job.gps_point_count} GPS points
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-500 flex-shrink-0" /><span className="truncate">{job.pickup_address}</span></div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500 flex-shrink-0" /><span className="truncate">{job.delivery_address}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-xs text-gray-400 text-right space-y-1">
                  <div className="flex items-center gap-1 justify-end"><Calendar className="w-3.5 h-3.5" />{new Date(job.scheduled_date).toLocaleDateString()}</div>
                  {job.driver_name && <div className="flex items-center gap-1 justify-end"><User className="w-3.5 h-3.5" />{job.driver_name}</div>}
                  {job.registration_number && <div className="flex items-center gap-1 justify-end"><Truck className="w-3.5 h-3.5" />{job.registration_number}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          </div>
        ))}
        {!jobs.length && (
          <div className="text-center py-16 text-gray-400">No job history yet.</div>
        )}
      </div>
    </div>
  );
}
