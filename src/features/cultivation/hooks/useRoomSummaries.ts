import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RoomSummary, RoomSummaryStrain, GrowthStage, RoomType } from '../types';

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
          grow_rooms ( id, name, room_code, room_type ),
          room_sections ( projected_harvest_date, flip_date )
        `)
        .neq('growth_stage', 'harvested');

      if (err) throw err;
      if (!data) { setSummaries([]); return; }

      const now = new Date();
      const roomMap = new Map<string, RoomSummary>();

      for (const row of data as Record<string, unknown>[]) {
        const roomId = row.grow_room_id as string;
        const room = row.grow_rooms as { id: string; name: string; room_code: string; room_type: RoomType } | null;
        if (!room) continue;

        let summary = roomMap.get(roomId);
        if (!summary) {
          summary = {
            room_id: roomId,
            room_name: room.name,
            room_code: room.room_code,
            room_type: room.room_type,
            strains: [],
            earliest_projected_harvest: null,
            earliest_flip_date: null,
            total_plant_count: 0,
            groups: [],
          };
          roomMap.set(roomId, summary);
        }

        const strainName = (row.strains as { name: string } | null)?.name ?? 'Unknown';
        const plantCount = (row.plant_count as number) ?? 0;
        const existing = summary.strains.find((s) => s.name === strainName);
        if (existing) {
          existing.plant_count += plantCount;
        } else {
          summary.strains.push({ name: strainName, plant_count: plantCount });
        }

        summary.total_plant_count += plantCount;

        const sectionData = row.room_sections as { projected_harvest_date: string | null; flip_date: string | null } | null;
        const projectedHarvest = sectionData?.projected_harvest_date ?? null;
        if (projectedHarvest) {
          if (!summary.earliest_projected_harvest || projectedHarvest < summary.earliest_projected_harvest) {
            summary.earliest_projected_harvest = projectedHarvest;
          }
        }
        const flipDate = sectionData?.flip_date ?? null;
        if (flipDate) {
          if (!summary.earliest_flip_date || flipDate < summary.earliest_flip_date) {
            summary.earliest_flip_date = flipDate;
          }
        }

        summary.groups.push({
          id: row.id as string,
          strain: strainName,
          stage: row.growth_stage as GrowthStage,
          plant_count: plantCount,
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
