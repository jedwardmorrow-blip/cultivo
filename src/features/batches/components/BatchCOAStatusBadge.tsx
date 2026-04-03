import type { BatchCOAStatus } from '@/types/batch.types';

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<BatchCOAStatus, StatusConfig> = {
  curing:              { label: 'Curing',         className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  pending_sampling:    { label: 'Pending Sample',  className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  testing_in_progress: { label: 'Testing',         className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  coa_received:        { label: 'COA Received',    className: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  coa_failed:          { label: 'COA Failed',      className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  available:           { label: 'Available',       className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

interface BatchCOAStatusBadgeProps {
  status: BatchCOAStatus | string | null | undefined;
  size?: 'sm' | 'xs';
}

export function BatchCOAStatusBadge({ status, size = 'sm' }: BatchCOAStatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status as BatchCOAStatus];
  if (!config) return null;

  const sizeClass = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded border uppercase tracking-wider font-montserrat ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
