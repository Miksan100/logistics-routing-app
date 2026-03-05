'use client';
import { useState } from 'react';
import type { Driver, Vehicle } from '@/types';
import { X, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  drivers: Driver[];
  vehicles: Vehicle[];
  onClose: () => void;
  onSave: (form: Record<string, unknown>) => Promise<void>;
}

export default function JobModal({ drivers, vehicles, onClose, onSave }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    title: '', description: '',
    pickupAddress: '', pickupLat: '', pickupLng: '',
    deliveryAddress: '', deliveryLat: '', deliveryLng: '',
    scheduledDate: today,
    estimatedDurationMinutes: '', plannedRouteDistanceKm: '',
    assignedDriverId: '', assignedVehicleId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const upd = (k: string, val: string) => setForm((p) => ({ ...p, [k]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await onSave({
        ...form,
        pickupLat: form.pickupLat ? parseFloat(form.pickupLat) : null,
        pickupLng: form.pickupLng ? parseFloat(form.pickupLng) : null,
        deliveryLat: form.deliveryLat ? parseFloat(form.deliveryLat) : null,
        deliveryLng: form.deliveryLng ? parseFloat(form.deliveryLng) : null,
        estimatedDurationMinutes: form.estimatedDurationMinutes ? parseInt(form.estimatedDurationMinutes) : null,
        plannedRouteDistanceKm: form.plannedRouteDistanceKm ? parseFloat(form.plannedRouteDistanceKm) : null,
        assignedDriverId: form.assignedDriverId || null,
        assignedVehicleId: form.assignedVehicleId || null,
      });
      onClose();
    } catch (err: any) { setError(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Create Job</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div><label className="label">Job Title *</label><input className="input-field" required value={form.title} onChange={(e) => upd('title', e.target.value)} /></div>
          <div><label className="label">Description</label><textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => upd('description', e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 text-sm">Pickup Location</h4>
              <div><label className="label">Address *</label><input className="input-field" required value={form.pickupAddress} onChange={(e) => upd('pickupAddress', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Latitude</label><input className="input-field" type="number" step="any" value={form.pickupLat} onChange={(e) => upd('pickupLat', e.target.value)} /></div>
                <div><label className="label">Longitude</label><input className="input-field" type="number" step="any" value={form.pickupLng} onChange={(e) => upd('pickupLng', e.target.value)} /></div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 text-sm">Delivery Location</h4>
              <div><label className="label">Address *</label><input className="input-field" required value={form.deliveryAddress} onChange={(e) => upd('deliveryAddress', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Latitude</label><input className="input-field" type="number" step="any" value={form.deliveryLat} onChange={(e) => upd('deliveryLat', e.target.value)} /></div>
                <div><label className="label">Longitude</label><input className="input-field" type="number" step="any" value={form.deliveryLng} onChange={(e) => upd('deliveryLng', e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Scheduled Date *</label><input className="input-field" type="date" required value={form.scheduledDate} onChange={(e) => upd('scheduledDate', e.target.value)} /></div>
            <div><label className="label">Duration (min)</label><input className="input-field" type="number" value={form.estimatedDurationMinutes} onChange={(e) => upd('estimatedDurationMinutes', e.target.value)} /></div>
            <div><label className="label">Distance (km)</label><input className="input-field" type="number" step="0.1" value={form.plannedRouteDistanceKm} onChange={(e) => upd('plannedRouteDistanceKm', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Assign Driver</label>
              <select className="input-field" value={form.assignedDriverId} onChange={(e) => upd('assignedDriverId', e.target.value)}>
                <option value="">Unassigned</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
              </select>
            </div>
            <div><label className="label">Assign Vehicle</label>
              <select className="input-field" value={form.assignedVehicleId} onChange={(e) => upd('assignedVehicleId', e.target.value)}>
                <option value="">Unassigned</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
