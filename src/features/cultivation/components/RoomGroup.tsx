import type { ReactNode } from 'react';
import type { RoomType } from '../types';

const TYPE_CONFIG: Record<RoomType, { color: string; label: string }> = {
  mother: { color: 'bg-amber-500', label: 'Mother Rooms' },
  clone: { color: 'bg-sky-500', label: 'Clone Rooms' },
  veg: { color: 'bg-emerald-500', label: 'Veg Rooms' },
  flower: { color: 'bg-rose-500', label: 'Flower Rooms' },
  mixed: { color: 'bg-cult-medium-gray', label: 'Mixed Rooms' },
};

interface RoomGroupProps {
  roomType: RoomType;
  count: number;
  children: ReactNode;
}

export function RoomGroup({ roomType, count, children }: RoomGroupProps) {
  if (count === 0) return null;

  const config = TYPE_CONFIG[roomType] ?? TYPE_CONFIG.mixed;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-xs text-cult-light-gray uppercase tracking-widest font-semibold">
          {config.label} ({count})
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
}
