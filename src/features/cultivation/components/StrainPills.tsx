import type { RoomSummaryStrain } from '../types';

const MAX_VISIBLE = 3;

function abbreviate(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join('').toUpperCase().slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

interface StrainPillsProps {
  strains: RoomSummaryStrain[];
}

export function StrainPills({ strains }: StrainPillsProps) {
  if (strains.length === 0) return null;

  const visible = strains.slice(0, MAX_VISIBLE);
  const overflow = strains.length - MAX_VISIBLE;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((s) => (
        <span
          key={s.name}
          className="inline-flex items-center gap-1 bg-cult-surface-raised text-cult-text-muted text-xs px-2 py-0.5 font-mono"
        >
          {abbreviate(s.name)}
          <span className="text-cult-border">&times;{s.plant_count}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center text-cult-border text-xs px-2 py-0.5">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
