'use client';
import type { Driver, Vehicle } from '@/types';
import { Phone, Mail, Car, Pencil, Trash2 } from 'lucide-react';

interface Props {
  driver: Driver;
  onEdit: (d: Driver) => void;
  onDelete: (id: string) => void;
}

export default function DriverCard({ driver: d, onEdit, onDelete }: Props) {
  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
        {d.first_name[0]}{d.last_name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{d.first_name} {d.last_name}</h3>
          {!d.is_active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactive</span>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{d.phone}</span>
          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{d.email}</span>
          {d.registration_number && (
            <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{d.registration_number} {d.make} {d.model}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          License: {d.license_number} · Expires: {new Date(d.license_expiry).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(d)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(d.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
