'use client';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  emergency: 'bg-orange-100 text-orange-700',
  reschedule: 'bg-indigo-100 text-indigo-700',
  'no-show': 'bg-violet-100 text-violet-800',
  deleted: 'bg-slate-200 text-slate-600',
};

const DEFAULT_STYLE = 'bg-red-100 text-red-700';

export function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}) {
  const normalizedStatus = status?.toLowerCase() ?? '';
  const styleClass = STATUS_STYLES[normalizedStatus] ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium capitalize rounded-md ${styleClass} ${className}`}
    >
      {status || 'Pending'}
    </span>
  );
}
