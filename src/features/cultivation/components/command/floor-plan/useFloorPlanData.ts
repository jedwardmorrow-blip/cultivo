import { useMemo } from 'react';
import { useRoomOperationalState } from '../../../hooks/useRoomOperationalState';
import { FACILITY, type FacilityRoom, type RoomState } from './data';

/**
 * Bridge hook: reads `v_room_operational_state` and merges live ops data into
 * the Floor Plan's static FACILITY layout. Rooms that match by `room_code`
 * inherit live `urgency_score`, `total_plants`, `days_in_stage`, etc.
 * Rooms with no matching DB row keep their fixture values (e.g. CLN, MOM,
 * CURE off-cycle rooms — they have no harvest cycle to track in the view).
 */
export function useFloorPlanData() {
  const { rooms: liveRooms, loading, error } = useRoomOperationalState();

  const rooms: FacilityRoom[] = useMemo(() => {
    if (!liveRooms?.length) return FACILITY.rooms;

    const liveByCode = new Map(liveRooms.map((r) => [r.room_code, r]));

    return FACILITY.rooms.map((fixture) => {
      const live = liveByCode.get(fixture.code);
      if (!live) return fixture;

      // urgency_score → state bucket (mirrors FloorPlanSVG derivation)
      const urgencyState: RoomState =
        live.urgency_score >= 3 ? 'urgent'
        : live.urgency_score >= 1 ? 'attention'
        : 'active';

      // Set focused on the highest-urgency in-cycle room dynamically
      // (fixture marks FLW-02 focused; we let live data override below).
      return {
        ...fixture,
        // Preserve fixture geometry, override ops fields with live values
        dominant_stage: (live.dominant_stage as FacilityRoom['dominant_stage']) ?? fixture.dominant_stage,
        days_in_stage: live.days_in_stage ?? fixture.days_in_stage,
        days_to_harvest: live.days_to_harvest ?? fixture.days_to_harvest,
        total_plants: live.total_plants ?? fixture.total_plants,
        capacity_plants: live.capacity_plants ?? fixture.capacity_plants,
        occupancy_status: (live.occupancy_status as FacilityRoom['occupancy_status']) ?? fixture.occupancy_status,
        strain_count: live.strain_count ?? fixture.strain_count,
        urgency_score: live.urgency_score,
        tasks_today: live.tasks_today,
        tasks_completed_today: live.tasks_completed_today,
        // Keep fixture flag if live doesn't synthesize one — flags are derived
        // narrative bits ("RH 64.2%") not present in the view today.
        flag: fixture.flag,
        // urgency_score derived state is ignored at render-time (FloorPlanSVG
        // recomputes it), but we expose it for downstream consumers.
        // @ts-expect-error: not on FacilityRoom interface, attached for debug
        _liveState: urgencyState,
      };
    });
  }, [liveRooms]);

  // Pick the focused room dynamically: highest urgency, in-cycle, falls back
  // to fixture-marked focused if no live urgency exists.
  const focusedCode = useMemo(() => {
    const inCycleUrgent = rooms
      .filter((r) => r.inCycle && (r.urgency_score ?? 0) > 0)
      .sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0))[0];
    if (inCycleUrgent) return inCycleUrgent.code;
    const fixtureFocused = FACILITY.rooms.find((r) => r.focused);
    return fixtureFocused?.code ?? null;
  }, [rooms]);

  return { rooms, focusedCode, loading, error };
}
