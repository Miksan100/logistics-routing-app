'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jobsApi, driversApi, odometerApi } from '@/lib/api';
import type { Job, Driver, OdometerLog } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import { MapPin, Clock, Truck, Gauge, ChevronRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function DriverDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [odometerLog, setOdometerLog] = useState<OdometerLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [d, j] = await Promise.all([driversApi.me(), jobsApi.myJobs()]);
        setDriver(d);
        setJobs(j);
        if (d.assigned_vehicle_id) {
          const log = await odometerApi.today();
          setOdometerLog(log);
        }
      } finally { setLoading(false); }
    };
    init();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const pending = jobs.filter((j) => ['pending', 'started', 'in_progress'].includes(j.status)).length;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Good {getTimeOfDay()}, {driver?.first_name}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {/* Odometer reminder */}
      {driver?.assigned_vehicle_id && !odometerLog?.start_odometer && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">Record Start Odometer</p>
            <p className="text-amber-700 text-xs mt-0.5">Please record your vehicle odometer before starting work</p>
          </div>
          <button onClick={() => router.push('/driver/odometer')} className="text-amber-700 font-semibold text-sm">
            Record
          </button>
        </div>
      )}

      {odometerLog?.start_odometer && !odometerLog?.end_odometer && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-800 text-sm">Start odometer recorded: {Number(odometerLog.start_odometer).toLocaleString()} km</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{jobs.length}</p>
          <p className="text-sm text-gray-500 mt-1">Today's Jobs</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{completed}</p>
          <p className="text-sm text-gray-500 mt-1">Completed</p>
        </div>
      </div>

      {/* Job list */}
      <h2 className="font-semibold text-gray-900 mb-3">Today's Jobs</h2>
      <div className="space-y-3">
        {jobs.length === 0 && (
          <div className="card text-center py-10 text-gray-400">No jobs assigned for today</div>
        )}
        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => router.push('/driver/jobs/' + job.id)}
            className="card w-full text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={job.status} />
                </div>
                <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-start gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="truncate">{job.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="truncate">{job.delivery_address}</span>
                  </div>
                </div>
                {job.estimated_duration_minutes && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />{job.estimated_duration_minutes} min est.
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
