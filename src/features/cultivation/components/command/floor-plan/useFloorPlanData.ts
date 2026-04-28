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

  const isLive = !loading && (liveRooms?.length ?? 0) > 0;

  const rooms: FacilityRoom[] = useMemo(() => {
    if (!isLive) return FACILITY.rooms;

    const liveByCode = new Map(liveRooms.map((r) => [r.room_code, r]));

    return FACILITY.rooms.map((fixture) => {
      const live = liveByCode.get(fixture.code);
      if (!live) {
        // No live row for this code (off-cycle: CLN/MOM/CURE/LAB/WATER).
        // Strip the fixture's `focused` flag so it doesn't override live focus.
        return { ...fixture, focused: false };
      }

      const urgencyState: RoomState =
        live.urgency_score >= 3 ? 'urgent'
        : live.urgency_score >= 1 ? 'attention'
        : 'active';

      // Empty rooms (between cycles): zero out cycle metrics that fixture would
      // otherwise leak through (days_in_stage 42, days_to_harvest 21, etc.).
      const isEmpty = (live.total_plants ?? 0) === 0;

      return {
        ...fixture,
        // Strip fixture-level `focused` — live data drives focus selection now.
        focused: false,
        // Live data wins on every ops field; null lives produce null cells (no
        // fixture leak). For empty rooms we explicitly null cycle metrics.
        dominant_stage: (live.dominant_stage as FacilityRoom['dominant_stage']) ?? null,
        days_in_stage: isEmpty ? null : live.days_in_stage,
        days_to_harvest: isEmpty ? null : live.days_to_harvest,
        total_plants: live.total_plants ?? 0,
        capacity_plants: live.capacity_plants ?? fixture.capacity_plants,
        occupancy_status: (live.occupancy_status as FacilityRoom['occupancy_status']) ?? 'empty',
        strain_count: live.strain_count ?? 0,
        urgency_score: live.urgency_score,
        tasks_today: live.tasks_today,
        tasks_completed_today: live.tasks_completed_today,
        // Drop fixture flags ("RH 64.2%") — they were synthetic narrative.
        flag: undefined,
        // @ts-expect-error: extension fields for downstream side-rail use
        section_projected_harvest: live.section_projected_harvest,
        // @ts-expect-error: extension field — primary factual time-to-harvest signal
        section_days_to_harvest: live.section_days_to_harvest,
        // @ts-expect-error: extension field
        last_harvest_date: live.last_harvest_date,
        // @ts-expect-error: extension field
        last_harvest_wet_grams: live.last_harvest_wet_grams,
        // @ts-expect-error: debug attachment (kept for cross-tool queries; UI no longer uses)
        _liveState: urgencyState,
      };
    });
  }, [isLive, liveRooms]);

  // Live focus pick: highest-urgency in-cycle room. No fixture fallback once
  // live data is present; pre-live we deliberately return null so the rail
  // shows its empty-state placeholder until rooms load.
  const focusedCode = useMemo(() => {
    if (!isLive) return null;
    const inCycleUrgent = rooms
      .filter((r) => r.inCycle && (r.urgency_score ?? 0) > 0)
      .sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0))[0];
    if (inCycleUrgent) return inCycleUrgent.code;
    // No urgent rooms: pick the first in-cycle room with plants.
    const firstActive = rooms.find((r) => r.inCycle && (r.total_plants ?? 0) > 0);
    return firstActive?.code ?? null;
  }, [isLive, rooms]);

  return { rooms, focusedCode, loading, error, isLive };
}
