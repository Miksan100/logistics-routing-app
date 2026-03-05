'use client';
import { useEffect, useState } from 'react';
import { vehiclesApi } from '@/lib/api';
import type { Vehicle } from '@/types';
import VehicleModal from '@/components/admin/VehicleModal';
import { Plus, Search, Pencil, Trash2, Gauge, Loader2 } from 'lucide-react';

const FUEL_COLORS: Record<string, string> = {
  petrol: 'bg-orange-100 text-orange-700',
  diesel: 'bg-gray-100 text-gray-700',
  electric: 'bg-green-100 text-green-700',
  hybrid: 'bg-teal-100 text-teal-700',
  lpg: 'bg-yellow-100 text-yellow-700',
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const load = async () => {
    setLoading(true);
    try { setVehicles(await vehiclesApi.list()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form: Record<string, unknown>) => {
    if (editing) await vehiclesApi.update(editing.id, form);
    else await vehiclesApi.create(form);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this vehicle?')) return;
    await vehiclesApi.delete(id);
    load();
  };

  const filtered = vehicles.filter((v) =>
    (v.registration_number + ' ' + v.make + ' ' + v.model).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
          <p className="text-gray-500 text-sm mt-1">{vehicles.length} vehicles</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles..." className="input-field pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <div key={v.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{v.registration_number}</h3>
                  <p className="text-gray-600">{v.year} {v.make} {v.model}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(v); setShowModal(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(v.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={'text-xs font-medium px-2.5 py-1 rounded-full ' + (FUEL_COLORS[v.fuel_type] || 'bg-gray-100 text-gray-700')}>
                  {v.fuel_type}
                </span>
                {!v.is_active && <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Inactive</span>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                <Gauge className="w-4 h-4" />
                <span>{Number(v.current_odometer).toLocaleString()} km odometer</span>
              </div>
              {v.assigned_driver_name && (
                <p className="mt-2 text-xs text-blue-600 font-medium">Driver: {v.assigned_driver_name}</p>
              )}
            </div>
          ))}
          {!filtered.length && (
            <div className="col-span-full text-center py-16 text-gray-400">No vehicles found.</div>
          )}
        </div>
      )}

      {showModal && (
        <VehicleModal vehicle={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSave={handleSave} />
      )}
    </div>
  );
}
