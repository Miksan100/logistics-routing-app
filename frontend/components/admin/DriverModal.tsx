'use client';
import { useState } from 'react';
import type { Driver, Vehicle } from '@/types';
import { X, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  driver: Driver | null;
  vehicles: Vehicle[];
  onClose: () => void;
  onSave: (form: Record<string, string | null>) => Promise<void>;
}

export default function DriverModal({ driver, vehicles, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    firstName: driver?.first_name || '',
    lastName: driver?.last_name || '',
    phone: driver?.phone || '',
    email: driver?.email || '',
    licenseNumber: driver?.license_number || '',
    licenseExpiry: driver?.license_expiry ? driver.license_expiry.split('T')[0] : '',
    assignedVehicleId: driver?.assigned_vehicle_id || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, assignedVehicleId: form.assignedVehicleId || null });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{driver ? 'Edit Driver' : 'Add Driver'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name *</label><input className="input-field" required value={form.firstName} onChange={(e) => f('firstName', e.target.value)} /></div>
            <div><label className="label">Last Name *</label><input className="input-field" required value={form.lastName} onChange={(e) => f('lastName', e.target.value)} /></div>
          </div>
          <div><label className="label">Phone *</label><input className="input-field" type="tel" required value={form.phone} onChange={(e) => f('phone', e.target.value)} /></div>
          <div><label className="label">Email *</label><input className="input-field" type="email" required value={form.email} onChange={(e) => f('email', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">License No. *</label><input className="input-field" required value={form.licenseNumber} onChange={(e) => f('licenseNumber', e.target.value)} /></div>
            <div><label className="label">Expiry *</label><input className="input-field" type="date" required value={form.licenseExpiry} onChange={(e) => f('licenseExpiry', e.target.value)} /></div>
          </div>
          <div>
            <label className="label">Assigned Vehicle</label>
            <select className="input-field" value={form.assignedVehicleId} onChange={(e) => f('assignedVehicleId', e.target.value)}>
              <option value="">No vehicle assigned</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{driver ? 'New Password (blank = keep)' : 'Password *'}</label>
            <input className="input-field" type="password" required={!driver} value={form.password} onChange={(e) => f('password', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {driver ? 'Save Changes' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
