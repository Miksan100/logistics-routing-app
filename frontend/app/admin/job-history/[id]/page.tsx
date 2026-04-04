'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { jobsApi, trackingApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { ArrowLeft, MapPin, Clock, Truck, User, Route, Loader2, AlertCircle } from 'lucide-react';

const RouteMap = dynamic(() => import('@/components/admin/RouteMap'), { ssr: false });

export default function JobHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [route, setRoute] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([jobsApi.get(id), trackingApi.jobRoute(id)])
      .then(([j, r]) => { setJob(j); setRoute(r); })
      .catch(() => setError('Failed to load job details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (error || !job) return (
    <div className="p-6"><div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg"><AlertCircle className="w-5 h-5" />{error || 'Job not found'}</div></div>
  );

  const duration = job.started_at && job.completed_at
    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Job History</span>
      </button>

      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="space-y-2">
            <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs text-gray-400 font-semibold uppercase">Pickup</p><p>{job.pickup_address}</p></div></div>
            <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs text-gray-400 font-semibold uppercase">Delivery</p><p>{job.delivery_address}</p></div></div>
          </div>
          <div className="space-y-2">
            {job.driver_name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /><span>{job.driver_name}</span></div>}
            {job.registration_number && <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-gray-500" /><span>{job.registration_number} — {job.make} {job.model}</span></div>}
            {duration !== null && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /><span>{duration} min actual duration</span></div>}
            {job.route_distance_km && <div className="flex items-center gap-2"><Route className="w-4 h-4 text-blue-500" /><span>{job.route_distance_km} km · {job.route_duration_minutes} min planned</span></div>}
            <div className="flex items-center gap-2"><Route className="w-4 h-4 text-gray-400" /><span>{route.length} GPS points recorded</span></div>
          </div>
        </div>

        {(job.started_at || job.completed_at) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-400">
            {job.started_at && <span>Started: {new Date(job.started_at).toLocaleString()}</span>}
            {job.completed_at && <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Route className="w-4 h-4 text-blue-600" /> Route Taken
        </h2>
        {route.length > 0 || job.route_polyline ? (
          <RouteMap points={route} polyline={job.route_polyline} />
        ) : (
          <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl text-gray-400 text-sm">
            No route data recorded for this job.
          </div>
        )}
      </div>
    </div>
  );
}
