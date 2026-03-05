'use client';
import type { JobStatus } from '@/types';

const STATUS_CONFIG: Record<JobStatus, { label: string; cls: string }> = {
  pending:     { label: 'Pending',     cls: 'bg-gray-100 text-gray-700' },
  started:     { label: 'Started',     cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', cls: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ' + cfg.cls}>
      {cfg.label}
    </span>
  );
}
