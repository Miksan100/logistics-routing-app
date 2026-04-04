'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobsApi, odometerApi, trackingApi } from '@/lib/api';
import { getRouteData, buildGoogleMapsUrl } from '@/lib/googleMaps';
import type { Job } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  MapPin, Clock, Truck, ArrowLeft, Loader2, AlertCircle,
  Play, Zap, CheckCircle2, XCircle, Gauge, Navigation
} from 'lucide-react';
import WeatherBadge from '@/components/shared/WeatherBadge';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [error, setError] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const [showStartOdo, setShowStartOdo] = useState(false);
  const [startOdo, setStartOdo] = useState('');
  const [showEndOdo, setShowEndOdo] = useState(false);
  const [endOdo, setEndOdo] = useState('');

  // Stop GPS tracking on unmount
  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (wakeLockRef.current) wakeLockRef.current.release();
  }, []);

  const startGPSTracking = (jobId: string) => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        trackingApi.recordJobGPS(jobId, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => { wakeLockRef.current = lock; }).catch(() => {});
    }
  };

  const stopGPSTracking = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
  };

  const load = async () => {
    try { setJob(await jobsApi.get(id)); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed to load job'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true); setError('');
    try { await action(); await load(); setShowCancelForm(false); }
    catch (err: any) { setError(err.response?.data?.error || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const openGoogleMaps = (j: Job) => {
    const url = buildGoogleMapsUrl(
      j.pickup_address, j.delivery_address,
      j.pickup_lat, j.pickup_lng, j.delivery_lat, j.delivery_lng
    );
    window.open(url, '_blank');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!job) return (
    <div className="p-4 text-center py-16 text-gray-400">Job not found</div>
  );

  const canStart    = job.status === 'pending';
  const canProgress = job.status === 'started';
  const canComplete = job.status === 'in_progress';
  const canCancel   = ['pending', 'started', 'in_progress'].includes(job.status);
  const isDone      = job.status === 'completed' || job.status === 'cancelled';
  const isActive    = job.status === 'started' || job.status === 'in_progress';

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to jobs</span>
      </button>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Job card */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>

        {job.description && (
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{job.description}</p>
        )}

        {/* Route visual */}
        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 pb-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Pickup</p>
              <p className="text-gray-900 font-medium mt-0.5">{job.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Delivery</p>
              <p className="text-gray-900 font-medium mt-0.5">{job.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Weather at pickup and delivery locations */}
        <WeatherBadge lat={job.pickup_lat} lng={job.pickup_lng} address={job.pickup_address} label="Weather at pickup" />
        <WeatherBadge lat={job.delivery_lat} lng={job.delivery_lng} address={job.delivery_address} label="Weather at delivery" />

        {/* Meta */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-500">
          {(job as any).route_duration_minutes ? (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />{(job as any).route_duration_minutes} min
            </span>
          ) : job.estimated_duration_minutes ? (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />{job.estimated_duration_minutes} min est.
            </span>
          ) : null}
          {(job as any).route_distance_km ? (
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4" />{(job as any).route_distance_km} km
            </span>
          ) : job.planned_route_distance_km ? (
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4" />{job.planned_route_distance_km} km
            </span>
          ) : null}
          {job.registration_number && (
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Truck className="w-4 h-4" />{job.registration_number} {job.make} {job.model}
            </span>
          )}
        </div>
      </div>

      {/* Open in Google Maps button — shown while job is active */}
      {isActive && (
        <button
          onClick={() => openGoogleMaps(job)}
          className="w-full py-3.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Navigation className="w-5 h-5" />
          Open in Google Maps
        </button>
      )}

      {/* Cancellation note */}
      {job.cancellation_reason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span className="font-semibold">Cancelled: </span>{job.cancellation_reason}
        </div>
      )}

      {/* Action buttons */}
      {!isDone && (
        <div className="space-y-3">
          {canStart && !showStartOdo && (
            <button
              onClick={() => setShowStartOdo(true)}
              disabled={actionLoading}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 rounded-xl"
            >
              <Play className="w-5 h-5" />
              Start Job
            </button>
          )}

          {canStart && showStartOdo && (
            <div className="card border border-blue-200 bg-blue-50 space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-gray-900">Enter Start Odometer Reading</p>
              </div>
              <input
                type="number"
                className="input-field bg-white"
                placeholder="e.g. 45320"
                value={startOdo}
                onChange={(e) => setStartOdo(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowStartOdo(false); setStartOdo(''); }} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => startOdo && doAction(async () => {
                    // Open Google Maps immediately (before awaits) to avoid popup blocker
                    const mapsTab = window.open('', '_blank');
                    await odometerApi.startDay(parseFloat(startOdo), job.assigned_vehicle_id ?? undefined);
                    await jobsApi.start(job.id);
                    // Fetch and save route data in background (non-blocking)
                    getRouteData(
                      job.pickup_lat && job.pickup_lng ? { lat: job.pickup_lat, lng: job.pickup_lng } : job.pickup_address,
                      job.delivery_lat && job.delivery_lng ? { lat: job.delivery_lat, lng: job.delivery_lng } : job.delivery_address,
                    ).then((route) => {
                      if (route) jobsApi.saveRoute(job.id, route).catch(() => {});
                    });
                    startGPSTracking(job.id);
                    setShowStartOdo(false); setStartOdo('');
                    // Navigate the already-opened tab to Google Maps
                    const url = buildGoogleMapsUrl(
                      job.pickup_address, job.delivery_address,
                      job.pickup_lat, job.pickup_lng, job.delivery_lat, job.delivery_lng
                    );
                    if (mapsTab) mapsTab.location.href = url;
                  })}
                  disabled={!startOdo || actionLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Start
                </button>
              </div>
            </div>
          )}

          {canProgress && (
            <button
              onClick={() => doAction(() => jobsApi.progress(job.id))}
              disabled={actionLoading}
              className="w-full py-4 text-base bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Mark In Progress
            </button>
          )}

          {canComplete && !showEndOdo && (
            <button
              onClick={() => setShowEndOdo(true)}
              disabled={actionLoading}
              className="btn-success w-full py-4 text-base flex items-center justify-center gap-2 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete Job
            </button>
          )}

          {canComplete && showEndOdo && (
            <div className="card border border-green-200 bg-green-50 space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-gray-900">Enter End Odometer Reading</p>
              </div>
              <input
                type="number"
                className="input-field bg-white"
                placeholder="e.g. 45580"
                value={endOdo}
                onChange={(e) => setEndOdo(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowEndOdo(false); setEndOdo(''); }} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => endOdo && doAction(async () => {
                    await odometerApi.endDay(parseFloat(endOdo), job.assigned_vehicle_id ?? undefined);
                    await jobsApi.complete(job.id);
                    setShowEndOdo(false); setEndOdo('');
                    stopGPSTracking();
                  })}
                  disabled={!endOdo || actionLoading}
                  className="btn-success flex-1 flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Complete
                </button>
              </div>
            </div>
          )}

          {canCancel && !showCancelForm && (
            <button
              onClick={() => setShowCancelForm(true)}
              className="btn-danger w-full py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" /> Cancel Job
            </button>
          )}

          {showCancelForm && (
            <div className="card border border-red-200 bg-red-50 space-y-3">
              <p className="font-semibold text-gray-900">Reason for cancellation <span className="text-red-600">*</span></p>
              <textarea
                className="input-field resize-none bg-white"
                rows={3}
                placeholder="Please provide a reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowCancelForm(false); setCancelReason(''); }} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => cancelReason.trim() && doAction(() => jobsApi.cancel(job.id, cancelReason))}
                  disabled={!cancelReason.trim() || actionLoading}
                  className="btn-danger flex-1 flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status history */}
      {job.statusHistory && job.statusHistory.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Activity</h3>
          <div className="space-y-2">
            {job.statusHistory.map((s) => (
              <div key={s.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800 capitalize">{s.new_status.replace('_', ' ')}</span>
                  <span className="text-gray-400 ml-2 text-xs">
                    {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {s.note && <p className="text-gray-500 text-xs mt-0.5 truncate">{s.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
