import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useProductionPlanner,
  WEEKS_AFTER_CURRENT,
  WEEKS_AFTER_PLANNING,
} from '@/features/production-planner/hooks/useProductionPlanner';
import { supabase } from '@/lib/supabase';
import type {
  RoomOccupancy,
  StrainCultivationStats,
  PlannedCycleTimelineRow,
} from '@/features/production-planner/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// =====================================================
// Fixture factories
// =====================================================

function makeOccupancy(overrides: Partial<RoomOccupancy> = {}): RoomOccupancy {
  return {
    room_id: 'room-001',
    room_name: 'Flower Room 1',
    room_type: 'flower',
    capacity_plants: 100,
    square_footage: 400,
    strain_id: 'strain-001',
    strain_name: 'Blue Dream',
    plant_count: 50,
    growth_stage: 'flower',
    earliest_planted_date: '2026-02-01',
    estimated_harvest_date: null,
    stage_entered_at: '2026-03-15',
    days_in_stage: 17,
    is_mother: false,
    total_plants: 50,
    strain_count: 1,
    capacity_utilization_pct: 50,
    ...overrides,
  };
}

function makeStrainStats(overrides: Partial<StrainCultivationStats> = {}): StrainCultivationStats {
  return {
    strain_id: 'strain-001',
    strain_name: 'Blue Dream',
    display_name: 'Blue Dream',
    dominance_type: 'hybrid',
    category: null,
    is_active: true,
    flowering_time_days: 63,
    veg_days_avg: 28,
    feed_group: null,
    flowering_time_class: 'medium',
    harvest_count: 5,
    avg_wet_weight_per_plant_g: 800,
    last_harvest_date: '2026-01-10',
    avg_wet_g_per_sqft: 100,
    avg_big_bud_pct: 65,
    avg_small_bud_pct: 20,
    avg_trim_pct: 10,
    avg_waste_pct: 5,
    avg_trim_grams_per_hour: 120,
    trim_session_count: 4,
    avg_rosin_yield_pct: 18,
    press_run_count: 3,
    avg_thc_pct: 22,
    avg_total_terpenes_mg_g: 15,
    coa_count: 3,
    demand_total_units: 20,
    demand_unassigned_units: 5,
    order_count: 10,
    conversion_confidence: 'high',
    conversion_sessions: 4,
    ...overrides,
  };
}

function makePlanRow(overrides: Partial<PlannedCycleTimelineRow> = {}): PlannedCycleTimelineRow {
  return {
    cycle_id: 'plan-001',
    strain_id: 'strain-002',
    strain_name: 'OG Kush',
    room_id: 'room-002',
    room_name: 'Flower Room 2',
    room_type: 'flower',
    capacity_plants: 100,
    planned_plant_count: 60,
    status: 'committed',
    clone_cut_date: '2026-04-01',
    veg_start_date: '2026-04-15',
    flower_start_date: '2026-05-13',
    estimated_harvest_date: '2026-07-15',
    forecast_yield_grams: 6000,
    forecast_price_per_gram: 4.0,
    forecast_revenue: 24000,
    labor_hours_per_week_room: 10,
    ...overrides,
  };
}

// =====================================================
// Mock setup helpers
// =====================================================

/** Make supabase.from() return different results for different table names */
function setupFromMock(responses: Record<string, { data: any; error: any }>) {
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    const res = responses[table] ?? { data: [], error: null };
    return {
      select: vi.fn().mockResolvedValue(res),
    };
  });
}

// =====================================================
// Tests
// =====================================================

describe('useProductionPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // Exported constants
  // =====================================================

  describe('constants', () => {
    it('WEEKS_AFTER_CURRENT is 16', () => {
      expect(WEEKS_AFTER_CURRENT).toBe(16);
    });

    it('WEEKS_AFTER_PLANNING is 26', () => {
      expect(WEEKS_AFTER_PLANNING).toBe(26);
    });
  });

  // =====================================================
  // Initial load
  // =====================================================

  describe('initial load', () => {
    it('starts with loading=true', () => {
      setupFromMock({
        v_room_occupancy: { data: [], error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());

      expect(result.current.loading).toBe(true);
    });

    it('loads occupancy and strain stats on mount', async () => {
      const occ = [makeOccupancy()];
      const stats = [makeStrainStats()];
      setupFromMock({
        v_room_occupancy: { data: occ, error: null },
        v_strain_cultivation_stats: { data: stats, error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(supabase.from).toHaveBeenCalledWith('v_room_occupancy');
      expect(supabase.from).toHaveBeenCalledWith('v_strain_cultivation_stats');
    });

    it('sets error message when occupancy fetch fails', async () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'v_room_occupancy') {
          return {
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error' },
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('DB error');
    });

    it('clears error on successful reload after failure', async () => {
      let callCount = 0;
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return { select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fail' } }) };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.error).toBe('Fail'));

      await act(async () => { await result.current.reload(); });

      expect(result.current.error).toBeNull();
    });
  });

  // =====================================================
  // Room aggregation
  // =====================================================

  describe('rooms aggregation', () => {
    it('aggregates occupancy rows into CalendarRoom objects', async () => {
      const occ = [makeOccupancy()];
      setupFromMock({
        v_room_occupancy: { data: occ, error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      expect(result.current.rooms[0].room_id).toBe('room-001');
      expect(result.current.rooms[0].strains).toHaveLength(1);
      expect(result.current.rooms[0].strains[0].strain_name).toBe('Blue Dream');
    });

    it('merges multiple strains for the same room into one CalendarRoom', async () => {
      const occ = [
        makeOccupancy({ strain_id: 'strain-001', strain_name: 'Blue Dream', plant_count: 30 }),
        makeOccupancy({ strain_id: 'strain-002', strain_name: 'OG Kush', plant_count: 20 }),
      ];
      setupFromMock({
        v_room_occupancy: { data: occ, error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      expect(result.current.rooms[0].strains).toHaveLength(2);
    });

    it('creates separate CalendarRoom entries for different rooms', async () => {
      const occ = [
        makeOccupancy({ room_id: 'room-001', room_name: 'Flower Room 1', room_type: 'flower' }),
        makeOccupancy({ room_id: 'room-002', room_name: 'Veg Room 1', room_type: 'veg' }),
      ];
      setupFromMock({
        v_room_occupancy: { data: occ, error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.rooms).toHaveLength(2);
    });

    it('sorts rooms by ROOM_TYPE_ORDER (mother first, flower last before mixed)', async () => {
      const occ = [
        makeOccupancy({ room_id: 'r-flower', room_name: 'Flower Room 1', room_type: 'flower', strain_id: null, strain_name: null }),
        makeOccupancy({ room_id: 'r-veg', room_name: 'Veg Room 1', room_type: 'veg', strain_id: null, strain_name: null }),
        makeOccupancy({ room_id: 'r-mother', room_name: 'Mother Room', room_type: 'mother', strain_id: null, strain_name: null }),
      ];
      setupFromMock({
        v_room_occupancy: { data: occ, error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const types = result.current.rooms.map((r) => r.room_type);
      expect(types).toEqual(['mother', 'veg', 'flower']);
    });

    it('skips strain entry when strain_id is null', async () => {
      const occ = [makeOccupancy({ strain_id: null, strain_name: null })];
      setupFromMock({
        v_room_occupancy: { data: occ, error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.rooms[0].strains).toHaveLength(0);
    });
  });

  // =====================================================
  // deriveRoomCode
  // =====================================================

  describe('room code derivation', () => {
    async function getRoomCode(roomName: string, roomType = 'flower') {
      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy({ room_name: roomName, room_type: roomType, strain_id: null, strain_name: null })],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });
      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));
      return result.current.rooms[0].room_code;
    }

    it('formats "Flower Room 1" as FLW-01', async () => {
      expect(await getRoomCode('Flower Room 1', 'flower')).toBe('FLW-01');
    });

    it('formats "Flower Room 12" as FLW-12', async () => {
      expect(await getRoomCode('Flower Room 12', 'flower')).toBe('FLW-12');
    });

    it('formats "Veg Room 2" as VEG-02', async () => {
      expect(await getRoomCode('Veg Room 2', 'veg')).toBe('VEG-02');
    });

    it('formats "Mother Room" as MOM-01', async () => {
      expect(await getRoomCode('Mother Room', 'mother')).toBe('MOM-01');
    });

    it('uses first 6 chars uppercase for unknown room names', async () => {
      expect(await getRoomCode('Clone Bay A', 'clone')).toBe('CLONE ');
    });
  });

  // =====================================================
  // strainStatsById lookup map
  // =====================================================

  describe('strainStatsById', () => {
    it('builds a lookup map keyed by strain_id', async () => {
      const stats = [
        makeStrainStats({ strain_id: 'strain-001', strain_name: 'Blue Dream' }),
        makeStrainStats({ strain_id: 'strain-002', strain_name: 'OG Kush' }),
      ];
      setupFromMock({
        v_room_occupancy: { data: [], error: null },
        v_strain_cultivation_stats: { data: stats, error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.strainStatsById.get('strain-001')?.strain_name).toBe('Blue Dream');
      expect(result.current.strainStatsById.get('strain-002')?.strain_name).toBe('OG Kush');
      expect(result.current.strainStatsById.size).toBe(2);
    });

    it('returns empty map when no strain stats are loaded', async () => {
      setupFromMock({
        v_room_occupancy: { data: [], error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.strainStatsById.size).toBe(0);
    });
  });

  // =====================================================
  // harvestAlerts
  // =====================================================

  describe('harvestAlerts', () => {
    it('returns alerts for strains with harvest within 21 days', async () => {
      const today = new Date();
      const in10Days = new Date(today);
      in10Days.setDate(today.getDate() + 10);
      const dateStr = in10Days.toISOString().split('T')[0];

      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy({ estimated_harvest_date: dateStr })],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.harvestAlerts).toHaveLength(1);
      expect(result.current.harvestAlerts[0].strain_name).toBe('Blue Dream');
      expect(result.current.harvestAlerts[0].days_until).toBe(10);
    });

    it('excludes strains with harvest more than 21 days out', async () => {
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(today.getDate() + 30);
      const dateStr = in30Days.toISOString().split('T')[0];

      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy({ estimated_harvest_date: dateStr })],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.harvestAlerts).toHaveLength(0);
    });

    it('excludes strains with past harvest dates', async () => {
      const pastDate = '2026-01-01'; // well in the past

      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy({ estimated_harvest_date: pastDate })],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.harvestAlerts).toHaveLength(0);
    });

    it('sorts alerts by days_until ascending', async () => {
      const today = new Date();
      const in5Days = new Date(today);
      in5Days.setDate(today.getDate() + 5);
      const in15Days = new Date(today);
      in15Days.setDate(today.getDate() + 15);

      setupFromMock({
        v_room_occupancy: {
          data: [
            makeOccupancy({
              room_id: 'r2', strain_id: 'strain-002', strain_name: 'OG Kush',
              estimated_harvest_date: in15Days.toISOString().split('T')[0],
            }),
            makeOccupancy({
              room_id: 'r1', strain_id: 'strain-001', strain_name: 'Blue Dream',
              estimated_harvest_date: in5Days.toISOString().split('T')[0],
            }),
          ],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.harvestAlerts[0].strain_name).toBe('Blue Dream');
      expect(result.current.harvestAlerts[1].strain_name).toBe('OG Kush');
    });

    it('includes alert for today (days_until = 0)', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy({ estimated_harvest_date: dateStr })],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.harvestAlerts).toHaveLength(1);
      // Math.ceil can produce -0 when est == today; Math.abs normalises to +0
      expect(Math.abs(result.current.harvestAlerts[0].days_until)).toBe(0);
    });

    it('returns empty list when no strains have harvest dates', async () => {
      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy({ estimated_harvest_date: null })],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.harvestAlerts).toHaveLength(0);
    });
  });

  // =====================================================
  // View mode and planned cycles
  // =====================================================

  describe('viewMode and planning data', () => {
    it('defaults to current view mode', async () => {
      setupFromMock({
        v_room_occupancy: { data: [], error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.viewMode).toBe('current');
    });

    it('does not fetch planned timeline in current mode', async () => {
      setupFromMock({
        v_room_occupancy: { data: [], error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const allCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map(([t]: [string]) => t);
      expect(allCalls).not.toContain('v_planned_cycles_timeline');
    });

    it('fetches planned timeline when view mode switches to planning', async () => {
      const planRow = makePlanRow();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'v_planned_cycles_timeline') {
          return { select: vi.fn().mockResolvedValue({ data: [planRow], error: null }) };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { result.current.setViewMode('planning'); });
      await waitFor(() => {
        const allCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map(([t]: [string]) => t);
        expect(allCalls).toContain('v_planned_cycles_timeline');
      });
    });

    it('merges planned cycles into rooms when in planning mode', async () => {
      const planRow = makePlanRow({ room_id: 'room-002', room_name: 'Flower Room 2' });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'v_planned_cycles_timeline') {
          return { select: vi.fn().mockResolvedValue({ data: [planRow], error: null }) };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { result.current.setViewMode('planning'); });

      // Give async planned data time to load
      await waitFor(() => {
        const planRoom = result.current.rooms.find((r) => r.room_id === 'room-002');
        expect(planRoom?.plannedCycles).toHaveLength(1);
      });

      const planRoom = result.current.rooms.find((r) => r.room_id === 'room-002');
      expect(planRoom?.plannedCycles?.[0].strain_name).toBe('OG Kush');
    });

    it('does not include plannedCycles content when in current mode', async () => {
      setupFromMock({
        v_room_occupancy: {
          data: [makeOccupancy()],
          error: null,
        },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // In current mode, plannedCycles array should be empty
      expect(result.current.rooms[0].plannedCycles).toHaveLength(0);
    });

    it('silently ignores errors from v_planned_cycles_timeline', async () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'v_planned_cycles_timeline') {
          return {
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'relation does not exist' },
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { result.current.setViewMode('planning'); });

      // Should not set error — planned timeline errors are silently ignored
      expect(result.current.error).toBeNull();
    });
  });

  // =====================================================
  // reload / reloadPlanned
  // =====================================================

  describe('reload', () => {
    it('re-fetches occupancy and stats on reload()', async () => {
      setupFromMock({
        v_room_occupancy: { data: [], error: null },
        v_strain_cultivation_stats: { data: [], error: null },
      });

      const { result } = renderHook(() => useProductionPlanner());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const initialCallCount = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.length;

      await act(async () => { await result.current.reload(); });

      expect(
        (supabase.from as ReturnType<typeof vi.fn>).mock.calls.length
      ).toBeGreaterThan(initialCallCount);
    });
  });
});
