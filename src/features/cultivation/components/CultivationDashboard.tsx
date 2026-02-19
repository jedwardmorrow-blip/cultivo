import { useState } from 'react';
import { Sprout, Leaf, Scissors, Package, AlertTriangle, Flower } from 'lucide-react';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useHarvestSessions } from '../hooks/useHarvestSessions';
import { RoomMapCard } from './RoomMapCard';
import { PlantGroupDetailPanel } from './PlantGroupDetailPanel';
import { isValidStrainAbbreviation } from '../utils';
import type { PlantGroup } from '../types';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
  sub?: string;
}

function StatCard({ label, value, icon, accent = 'text-cult-white', sub }: StatCardProps) {
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cult-light-gray uppercase tracking-wider">{label}</span>
        <span className="text-cult-medium-gray">{icon}</span>
      </div>
      <span className={`text-3xl font-bold ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-cult-medium-gray">{sub}</span>}
    </div>
  );
}

interface StageBadgeProps {
  stage: string;
  count: number;
}

function StageBadge({ stage, count }: StageBadgeProps) {
  const styles: Record<string, string> = {
    clone: 'bg-sky-950 border-sky-700 text-sky-400',
    veg: 'bg-green-950 border-green-700 text-green-400',
    flower: 'bg-rose-950 border-rose-700 text-rose-400',
    harvested: 'bg-amber-950 border-amber-700 text-amber-400',
  };
  const cls = styles[stage] ?? 'bg-cult-black border-cult-medium-gray text-cult-light-gray';

  return (
    <div className={`flex items-center justify-between border px-3 py-2 ${cls}`}>
      <span className="text-xs uppercase tracking-wider font-semibold">{stage}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

export function CultivationDashboard() {
  const { rooms, loading: roomsLoading } = useGrowRooms();
  const { groups, loading: groupsLoading } = usePlantGroups({ stage: 'active' });
  const { sessions, loading: sessionsLoading } = useHarvestSessions({ status: 'active' });
  const [selectedGroup, setSelectedGroup] = useState<PlantGroup | null>(null);

  const loading = roomsLoading || groupsLoading || sessionsLoading;

  const activeRooms = rooms.filter((r) => r.is_active);

  const stageCounts = {
    clone: groups.filter((g) => g.growth_stage === 'clone').length,
    veg: groups.filter((g) => g.growth_stage === 'veg').length,
    flower: groups.filter((g) => g.growth_stage === 'flower').length,
  };

  const totalPlants = groups.reduce((sum, g) => sum + g.plant_count, 0);
  const motherGroups = groups.filter((g) => g.is_mother);

  const strainsWithoutAbbrev = Array.from(
    new Set(
      groups
        .filter((g) => !isValidStrainAbbreviation(g.strains?.abbreviation))
        .map((g) => g.strains?.name ?? 'Unknown')
    )
  );

  if (loading) {
    return <div className="p-6 text-cult-light-gray">Loading cultivation data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Cultivation</h1>
        <p className="text-cult-light-gray mt-2">Grow room management, plant tracking, and harvest sessions</p>
      </div>

      {strainsWithoutAbbrev.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-950 border border-amber-700 text-amber-300 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Abbreviation required for harvest: </span>
            {strainsWithoutAbbrev.join(', ')} — add 3-letter abbreviations in Products &gt; Strains.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Rooms"
          value={activeRooms.length}
          icon={<Package className="w-4 h-4" />}
        />
        <StatCard
          label="Active Groups"
          value={groups.length}
          icon={<Sprout className="w-4 h-4" />}
          sub={`${totalPlants.toLocaleString()} total plants`}
        />
        <StatCard
          label="Active Harvests"
          value={sessions.length}
          icon={<Scissors className="w-4 h-4" />}
          accent={sessions.length > 0 ? 'text-amber-400' : 'text-cult-white'}
        />
        <StatCard
          label="Mother Plants"
          value={motherGroups.length}
          icon={<Leaf className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-cult-near-black border border-cult-medium-gray p-5">
          <h2 className="text-xs text-cult-light-gray uppercase tracking-wider mb-4">Plants by Stage</h2>
          <div className="space-y-2">
            <StageBadge stage="clone" count={stageCounts.clone} />
            <StageBadge stage="veg" count={stageCounts.veg} />
            <StageBadge stage="flower" count={stageCounts.flower} />
          </div>
          {groups.length === 0 && (
            <p className="text-cult-medium-gray text-sm text-center py-4">No active plant groups</p>
          )}
        </div>

        <div className="bg-cult-near-black border border-cult-medium-gray p-5">
          <h2 className="text-xs text-cult-light-gray uppercase tracking-wider mb-4">Active Harvest Sessions</h2>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Flower className="w-8 h-8 text-cult-medium-gray" />
              <p className="text-cult-medium-gray text-sm">No active harvest sessions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border border-cult-medium-gray px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-cult-white text-sm font-mono">
                      {s.plant_groups?.group_number ?? '—'}
                    </span>
                    <span className="text-cult-light-gray text-xs">
                      {s.plant_groups?.strains?.name ?? 'Unknown Strain'}
                    </span>
                  </div>
                  <span className="text-cult-light-gray text-xs">
                    {s.wet_weight_grams >= 1000
                      ? `${(s.wet_weight_grams / 1000).toFixed(2)} kg`
                      : `${s.wet_weight_grams.toFixed(1)} g`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeRooms.length > 0 && (
        <div>
          <h2 className="text-xs text-cult-light-gray uppercase tracking-wider mb-3">Grow Rooms</h2>
          <div className="space-y-2">
            {activeRooms.map((room) => (
              <RoomMapCard
                key={room.id}
                room={room}
                onGroupSelect={setSelectedGroup}
              />
            ))}
          </div>
        </div>
      )}

      {selectedGroup && (
        <PlantGroupDetailPanel
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
