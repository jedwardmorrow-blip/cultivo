import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  RoomOccupancy,
  StrainCultivationStats,
  CalendarRoom,
  CalendarRoomStrain,
} from '../types';
import { ROOM_TYPE_ORDER } from '../types';

function deriveRoomCode(name: string): string {
  if (name.startsWith('Flower Room')) return `FLW-${name.replace('Flower Room ', '').padStart(2, '0')}`;
  if (name.startsWith('Veg Room')) return `VEG-${name.replace('Veg Room ', '').replace('Veg Room', '').trim().padStart(2, '0')}`;
  if (name === 'Mother Room') return 'MOM-01';
  return name.substring(0, 6).toUpperCase();
}

export function useProductionPlanner() {
  const [occupancy, setOccupancy] = useState<RoomOccupancy[]>([]);
  const [strainStats, setStrainStats] = useState<StrainCultivationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [occResult, statsResult] = await Promise.all([
        supabase.from('v_room_occupancy').select('*'),
        supabase.from('v_strain_cultivation_stats').select('*'),
      ]);

      if (occResult.error) throw occResult.error;
      if (statsResult.error) throw statsResult.error;

      setOccupancy(occResult.data ?? []);
      setStrainStats(statsResult.data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load production planner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Aggregate occupancy rows into CalendarRoom objects, sorted by room type */
  const rooms = useMemo<CalendarRoom[]>(() => {
    const roomMap = new Map<string, CalendarRoom>();

    for (const row of occupancy) {
      if (!roomMap.has(row.room_id)) {
        roomMap.set(row.room_id, {
          room_id: row.room_id,
          room_name: row.room_name,
          room_code: deriveRoomCode(row.room_name),
          room_type: row.room_type,
          capacity_plants: row.capacity_plants,
          square_footage: row.square_footage,
          total_plants: row.total_plants,
          strain_count: row.strain_count,
          capacity_utilization_pct: row.capacity_utilization_pct,
          strains: [],
        });
      }

      const room = roomMap.get(row.room_id)!;
      if (row.strain_id && row.strain_name) {
        room.strains.push({
          strain_id: row.strain_id,
          strain_name: row.strain_name,
          plant_count: row.plant_count ?? 0,
          growth_stage: row.growth_stage ?? 'unknown',
          earliest_planted_date: row.earliest_planted_date,
          estimated_harvest_date: row.estimated_harvest_date,
          stage_entered_at: row.stage_entered_at,
          days_in_stage: row.days_in_stage,
          is_mother: row.is_mother ?? false,
        });
      }
    }

    return Array.from(roomMap.values()).sort(
      (a, b) => (ROOM_TYPE_ORDER[a.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room_type] ?? 9)
    );
  }, [occupancy]);

  /** Strain stats lookup by ID */
  const strainStatsById = useMemo(() => {
    const map = new Map<string, StrainCultivationStats>();
    for (const s of strainStats) map.set(s.strain_id, s);
    return map;
  }, [strainStats]);

  /** Harvest alerts: rooms within 21 days of projected harvest */
  const harvestAlerts = useMemo(() => {
    const today = new Date();
    const alerts: { room_code: string; room_name: string; strain_name: string; days_until: number; estimated_date: string }[] = [];

    for (const room of rooms) {
      for (const strain of room.strains) {
        if (strain.estimated_harvest_date) {
          const est = new Date(strain.estimated_harvest_date);
          const diff = Math.ceil((est.getTime() - today.getTime()) / 86400000);
          if (diff >= 0 && diff <= 21) {
            alerts.push({
              room_code: room.room_code,
              room_name: room.room_name,
              strain_name: strain.strain_name,
              days_until: diff,
              estimated_date: strain.estimated_harvest_date,
            });
          }
        }
      }
    }

    return alerts.sort((a, b) => a.days_until - b.days_until);
  }, [rooms]);

  return {
    rooms,
    strainStats,
    strainStatsById,
    harvestAlerts,
    loading,
    error,
    reload: load,
  };
}
