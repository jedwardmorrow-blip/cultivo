interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
}

const DEFAULT_COLOR_MAP: Record<string, string> = {
  stored: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  allocated: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  washed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sold: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  curing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  available: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  partial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  depleted: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  reserved: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  fresh: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  cured: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  packaged: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const FALLBACK_CLASS = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

export function StatusBadge({ status, colorMap }: StatusBadgeProps) {
  const map = colorMap ?? DEFAULT_COLOR_MAP;
  const colorClass = map[status] ?? FALLBACK_CLASS;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border inline-block ${colorClass}`}>
      {label}
    </span>
  );
}
