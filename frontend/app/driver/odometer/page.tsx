'use client';
import { useEffect, useState } from 'react';
import { odometerApi, driversApi } from '@/lib/api';
import type { Driver, OdometerLog } from '@/types';
import { Gauge, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

type Step = 'loading' | 'no-vehicle' | 'start' | 'started' | 'end' | 'done';

export default function OdometerPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [log, setLog]       = useState<OdometerLog | null>(null);
  const [step, setStep]     = useState<Step>('loading');
  const [value, setValue]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const load = async () => {
    try {
      const d = await driversApi.me();
      setDriver(d);
      if (!d.assigned_vehicle_id) { setStep('no-vehicle'); return; }
      const l = await odometerApi.today();
      setLog(l);
      if (!l)                    setStep('start');
      else if (!l.end_odometer)  setStep('started');
      else                       setStep('done');
    } catch {
      setStep('start');
    }
  };

  useEffect(() => { load(); }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const l = await odometerApi.startDay(parseFloat(value));
      setLog(l); setValue(''); setStep('started');
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleEnd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const l = await odometerApi.endDay(parseFloat(value));
      setLog(l); setValue(''); setStep('done');
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (step === 'loading') return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Odometer</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Vehicle info */}
      {driver?.registration_number && (
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Gauge className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{driver.registration_number}</p>
            <p className="text-sm text-gray-500">{driver.make} {driver.model}</p>
          </div>
        </div>
      )}

      {step === 'no-vehicle' && (
        <div className="card flex items-center gap-3 border-amber-200 bg-amber-50">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm">No vehicle assigned. Contact your administrator.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Start of day form */}
      {step === 'start' && (
        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Start of Day</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your vehicle odometer reading before you begin</p>
          </div>
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="label">Odometer Reading (km) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                className="input-field text-2xl font-bold h-14"
                placeholder="e.g. 45230"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              Record Start Odometer
            </button>
          </form>
        </div>
      )}

      {/* In-progress state */}
      {step === 'started' && log && (
        <div className="space-y-4">
          <div className="card border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Start recorded</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{Number(log.start_odometer).toLocaleString()} km</p>
          </div>

          <div className="card space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">End of Day</h2>
              <p className="text-gray-500 text-sm mt-1">Record your odometer when you finish for the day</p>
            </div>
            <form onSubmit={handleEnd} className="space-y-4">
              <div>
                <label className="label">End Odometer Reading (km) *</label>
                <input
                  type="number"
                  step="0.1"
                  min={Number(log.start_odometer)}
                  required
                  className="input-field text-2xl font-bold h-14"
                  placeholder="e.g. 45580"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-success w-full py-4 text-base flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Record End Odometer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Done state */}
      {step === 'done' && log && (
        <div className="space-y-3">
          <div className="card border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Day complete</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Start</p>
                <p className="text-xl font-bold text-green-900 mt-1">
                  {Number(log.start_odometer).toLocaleString()}
                </p>
                <p className="text-xs text-green-600">km</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">End</p>
                <p className="text-xl font-bold text-green-900 mt-1">
                  {Number(log.end_odometer).toLocaleString()}
                </p>
                <p className="text-xs text-green-600">km</p>
              </div>
            </div>
            {log.distance_travelled != null && (
              <div className="mt-4 pt-3 border-t border-green-200 text-center">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Distance Travelled</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {Number(log.distance_travelled).toLocaleString()} km
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
