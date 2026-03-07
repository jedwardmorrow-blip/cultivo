import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RoomSummary, GrowthStage } from '../types';

function daysBetween(from: string, to: Date): number {
  const start = new Date(from);
  const diff = to.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function useRoomSummaries() {
  const [summaries, setSummaries] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('plant_groups')
        .select(`
          id,
          strain_id,
          grow_room_id,
          growth_stage,
          stage_entered_at,
          plant_count,
          room_section_id,
          strains ( name ),
          grow_rooms ( id, name, room_code ),
          room_sections ( projected_harvest_date )
        `)
        .neq('growth_stage', 'harvested');

      if (err) throw err;
      if (!data) { setSummaries([]); return; }

      const now = new Date();
      const roomMap = new Map<string, RoomSummary>();

      for (const row of data as Record<string, unknown>[]) {
        const roomId = row.grow_room_id as string;
        const room = row.grow_rooms as { id: string; name: string; room_code: string } | null;
        if (!room) continue;

        let summary = roomMap.get(roomId);
        if (!summary) {
          summary = {
            room_id: roomId,
            room_name: room.name,
            room_code: room.room_code,
            strains: [],
            earliest_projected_harvest: null,
            total_plant_count: 0,
            groups: [],
          };
          roomMap.set(roomId, summary);
        }

        const strainName = (row.strains as { name: string } | null)?.name ?? 'Unknown';
        if (!summary.strains.includes(strainName)) {
          summary.strains.push(strainName);
        }

        summary.total_plant_count += (row.plant_count as number) ?? 0;

        const sectionData = row.room_sections as { projected_harvest_date: string | null } | null;
        const projectedHarvest = sectionData?.projected_harvest_date ?? null;
        if (projectedHarvest) {
          if (!summary.earliest_projected_harvest || projectedHarvest < summary.earliest_projected_harvest) {
            summary.earliest_projected_harvest = projectedHarvest;
          }
        }

        summary.groups.push({
          id: row.id as string,
          strain: strainName,
          stage: row.growth_stage as GrowthStage,
          plant_count: (row.plant_count as number) ?? 0,
          days_in_stage: daysBetween(row.stage_entered_at as string, now),
        });
      }

      setSummaries(Array.from(roomMap.values()));
    } catch {
      setError('Failed to load room summaries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { summaries, loading, error, refetch: load };
}
