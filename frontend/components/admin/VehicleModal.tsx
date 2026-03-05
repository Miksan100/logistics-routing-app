'use client';
import { useState } from 'react';
import type { Vehicle } from '@/types';
import { X, AlertCircle, Loader2 } from 'lucide-react';

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'lpg'];

interface Props { vehicle: Vehicle | null; onClose: () => void; onSave: (form: Record<string, unknown>) => Promise<void>; }

export default function VehicleModal({ vehicle: v, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    registrationNumber: v?.registration_number || '',
    make: v?.make || '',
    model: v?.model || '',
    year: String(v?.year || new Date().getFullYear()),
    fuelType: v?.fuel_type || 'petrol',
    serviceIntervalKm: String(v?.service_interval_km || 10000),
    currentOdometer: String(v?.current_odometer || 0),
    trackingDeviceId: v?.tracking_device_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const upd = (k: string, val: string) => setForm((p) => ({ ...p, [k]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave({ ...form, year: parseInt(form.year), serviceIntervalKm: parseInt(form.serviceIntervalKm), currentOdometer: parseFloat(form.currentOdometer), trackingDeviceId: form.trackingDeviceId || null });
      onClose();
    } catch (err: any) { setError(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{v ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div><label className="label">Registration Number *</label><input className="input-field uppercase" required value={form.registrationNumber} onChange={(e) => upd('registrationNumber', e.target.value.toUpperCase())} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Make *</label><input className="input-field" required value={form.make} onChange={(e) => upd('make', e.target.value)} /></div>
            <div><label className="label">Model *</label><input className="input-field" required value={form.model} onChange={(e) => upd('model', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Year *</label><input className="input-field" type="number" min="1990" max="2030" required value={form.year} onChange={(e) => upd('year', e.target.value)} /></div>
            <div><label className="label">Fuel Type *</label>
              <select className="input-field" value={form.fuelType} onChange={(e) => upd('fuelType', e.target.value)}>
                {FUEL_TYPES.map((ft) => <option key={ft} value={ft}>{ft.charAt(0).toUpperCase() + ft.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Service Interval (km)</label><input className="input-field" type="number" value={form.serviceIntervalKm} onChange={(e) => upd('serviceIntervalKm', e.target.value)} /></div>
            <div><label className="label">Current Odometer (km)</label><input className="input-field" type="number" step="0.01" value={form.currentOdometer} onChange={(e) => upd('currentOdometer', e.target.value)} /></div>
          </div>
          <div><label className="label">Tracking Device ID</label><input className="input-field" placeholder="Optional" value={form.trackingDeviceId} onChange={(e) => upd('trackingDeviceId', e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {v ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
