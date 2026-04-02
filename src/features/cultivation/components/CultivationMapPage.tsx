import { lazy, Suspense } from 'react';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { useRoomOperationalState } from '../hooks/useRoomOperationalState';

const BuildingMapView = lazy(() => import('./building-map/BuildingMapView'));

export function CultivationMapPage() {
  const { rooms, loading: roomsLoading } = useGrowRooms();
  const { rooms: opsRooms, loading: opsLoading } = useRoomOperationalState();

  const loading = roomsLoading || opsLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Cultivation Map</h1>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <Suspense fallback={null}>
            <BuildingMapView
              rooms={rooms}
              opsRooms={opsRooms}
              onRoomSelect={() => {}}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
