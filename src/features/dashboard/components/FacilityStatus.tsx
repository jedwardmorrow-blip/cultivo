import type { CultivationSummary, DryRoom } from '../hooks/useDashboardData';

interface Props {
  cultivation: CultivationSummary;
  dryRooms: DryRoom[];
  onViewChange: (view: string) => void;
}

export function FacilityStatus({ cultivation, dryRooms, onViewChange: _onViewChange }: Props) {
  const stages = [
    { label: 'Flowering', value: cultivation.flowerCount, color: 'text-cult-stage-flower' },
    { label: 'Veg', value: cultivation.vegCount, color: 'text-cult-stage-veg' },
    { label: 'Harvested', value: cultivation.harvestedCount, color: 'text-cult-stage-harvest' },
  ];

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Facility Status
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-success/10 text-cult-success-bright">
          {cultivation.totalPlants.toLocaleString()} plants
        </span>
      </div>

      {/* Stage grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {stages.map(s => (
          <div key={s.label} className="text-center p-3.5 bg-cult-surface-overlay rounded-cult">
            <div className={`text-[1.75rem] font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
            <div className="text-[0.625rem] text-cult-text-muted uppercase tracking-[1px] font-semibold mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Dry Rooms */}
      <div className="mt-4 mb-2 text-[0.625rem] font-semibold uppercase tracking-[1.5px] text-cult-text-muted">
        Dry Rooms
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {dryRooms.map(room => (
          <div
            key={room.name}
            className={`p-4 bg-cult-surface-overlay rounded-cult text-center border transition-colors duration-200
              ${room.status === 'drying'
                ? 'border-cult-stage-harvest shadow-[0_0_12px_rgba(245,158,11,0.08)]'
                : 'border-cult-border opacity-50'
              }`}
          >
            <div className="text-xs font-bold tracking-[1px]">{room.name}</div>
            <div
              className={`text-[0.625rem] font-semibold uppercase tracking-wider mt-1
                ${room.status === 'drying' ? 'text-cult-stage-harvest' : 'text-cult-text-muted'}`}
            >
              {room.status === 'drying' ? 'Drying' : 'Available'}
            </div>
            {room.detail && (
              <div className="text-[0.6875rem] font-light text-cult-text-secondary mt-1.5">
                {room.detail}
              </div>
            )}
            {room.subDetail && (
              <div className="text-[0.6875rem] font-light text-cult-text-secondary">
                {room.subDetail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
