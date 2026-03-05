'use client';
import { useEffect, useState } from 'react';
import { driversApi, vehiclesApi } from '@/lib/api';
import type { Driver, Vehicle } from '@/types';
import DriverCard from '@/components/admin/DriverCard';
import DriverModal from '@/components/admin/DriverModal';
import { Plus, Search, Loader2 } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, v] = await Promise.all([driversApi.list(), vehiclesApi.list()]);
      setDrivers(d);
      setVehicles(v.filter((x: Vehicle) => x.is_active));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (d: Driver) => { setEditing(d); setShowModal(true); };
  const handleClose = () => { setShowModal(false); setEditing(null); };

  const handleSave = async (form: Record<string, string | null>) => {
    if (editing) await driversApi.update(editing.id, form);
    else await driversApi.create(form);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this driver?')) return;
    await driversApi.delete(id);
    load();
  };

  const filtered = drivers.filter((d) =>
    `${d.first_name} ${d.last_name} ${d.email} ${d.license_number}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-500 text-sm mt-1">{drivers.length} registered</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="input-field pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((d) => (
            <DriverCard key={d.id} driver={d} onEdit={openEdit} onDelete={handleDelete} />
          ))}
          {!filtered.length && (
            <div className="text-center py-16 text-gray-400">
              {search ? 'No drivers match your search' : 'No drivers yet. Add your first driver!'}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <DriverModal
          driver={editing}
          vehicles={vehicles}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
