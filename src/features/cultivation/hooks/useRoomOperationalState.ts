import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RoomOperationalState {
  room_id: string;
  room_code: string;
  room_type: string;
  capacity_plants: number | null;
  is_active: boolean;
  plant_group_count: number;
  total_plants: number;
  strain_count: number;
  strain_names: string[] | null;
  dominant_stage: string | null;
  days_in_stage: number | null;
  oldest_stage_entry: string | null;
  newest_stage_entry: string | null;
  occupancy_pct: number | null;
  occupancy_status: 'empty' | 'occupied' | 'full';
  earliest_harvest_date: string | null;
  latest_harvest_date: string | null;
  groups_near_harvest: number | null;
  next_harvest_date: string | null;
  last_harvest_date: string | null;
  last_harvest_wet_grams: number | null;
  days_to_harvest: number | null;
  tasks_today: number;
  tasks_completed_today: number;
  tasks_pending_today: number;
  tasks_in_progress_today: number;
  urgency_score: number;
  earliest_flip_date: string | null;
  days_since_flip: number | null;
  section_projected_harvest: string | null;
  section_days_to_harvest: number | null;
}

export function useRoomOperationalState() {
  const [rooms, setRooms] = useState<RoomOperationalState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: sbError } = await supabase
        .from('v_room_operational_state')
        .select('*')
        .order('urgency_score', { ascending: false })
        .order('room_code', { ascending: true });

      if (sbError) throw sbError;
      setRooms((data as RoomOperationalState[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch operational state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, error, refetch: fetchRooms };
}
