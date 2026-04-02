import { describe, it, expect, vi, beforeEach } from 'vitest';
import { plannedCyclesService } from '@/features/production-planner/services/plannedCyclesService';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';
import type {
  PlannedCycle,
  PlannedCycleTimelineRow,
  CreatePlannedCycleInput,
} from '@/features/production-planner/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// =====================================================
// Shared mock chain factories
// =====================================================

/** select().then() — resolves directly (no .single()) */
function mockSelectChain(resolvedValue: unknown) {
  const mockSelect = vi.fn().mockResolvedValue(resolvedValue);
  return { mockSelect };
}

/** insert().select().single() */
function mockInsertChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockInsert, mockSelect, mockSingle };
}

/** update().eq().select().single() */
function mockUpdateChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq, mockSelect, mockSingle };
}

/** delete().eq() */
function mockDeleteChain(resolvedValue: unknown) {
  const mockEq = vi.fn().mockResolvedValue(resolvedValue);
  const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockDelete, mockEq };
}

// =====================================================
// Fixtures
// =====================================================

const mockTimelineRow: PlannedCycleTimelineRow = {
  cycle_id: 'cycle-001',
  strain_id: 'strain-001',
  strain_name: 'Blue Dream',
  room_id: 'room-001',
  room_name: 'Flower Room 1',
  room_type: 'flower',
  capacity_plants: 100,
  planned_plant_count: 50,
  status: 'draft',
  clone_cut_date: '2026-03-01',
  veg_start_date: '2026-03-15',
  flower_start_date: '2026-04-12',
  estimated_harvest_date: '2026-06-19',
  forecast_yield_grams: 5000,
  forecast_price_per_gram: 4.5,
  forecast_revenue: 22500,
  labor_hours_per_week_room: 8,
};

const mockPlannedCycle: PlannedCycle = {
  id: 'cycle-001',
  strain_id: 'strain-001',
  target_room_id: 'room-001',
  planned_plant_count: 50,
  clone_cut_date: '2026-03-01',
  veg_start_date: '2026-03-15',
  flower_start_date: '2026-04-12',
  estimated_harvest_date: '2026-06-19',
  status: 'draft',
  linked_plant_group_id: null,
  forecast_yield_grams: 5000,
  forecast_price_per_gram: 4.5,
  mom_plant_group_id: null,
  notes: null,
  created_by: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

const mockCreateInput: CreatePlannedCycleInput = {
  strain_id: 'strain-001',
  target_room_id: 'room-001',
  planned_plant_count: 50,
  flower_start_date: '2026-04-12',
  estimated_harvest_date: '2026-06-19',
  clone_cut_date: '2026-03-01',
  veg_start_date: '2026-03-15',
  forecast_yield_grams: 5000,
  forecast_price_per_gram: 4.5,
};

// =====================================================
// Tests
// =====================================================

describe('plannedCyclesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // getTimeline
  // =====================================================

  describe('getTimeline', () => {
    it('queries v_planned_cycles_timeline with select *', async () => {
      const { mockSelect } = mockSelectChain(
        mockSupabaseSuccess([mockTimelineRow])
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      await plannedCyclesService.getTimeline();

      expect(supabase.from).toHaveBeenCalledWith('v_planned_cycles_timeline');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('returns array of timeline rows on success', async () => {
      const rows = [mockTimelineRow];
      const { mockSelect } = mockSelectChain(mockSupabaseSuccess(rows));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      const result = await plannedCyclesService.getTimeline();

      expect(result).toEqual(rows);
    });

    it('returns empty array when no rows exist', async () => {
      const { mockSelect } = mockSelectChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      const result = await plannedCyclesService.getTimeline();

      expect(result).toEqual([]);
    });

    it('throws when Supabase returns an error', async () => {
      const { mockSelect } = mockSelectChain(
        mockSupabaseError('relation "v_planned_cycles_timeline" does not exist')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      await expect(plannedCyclesService.getTimeline()).rejects.toMatchObject({
        message: 'relation "v_planned_cycles_timeline" does not exist',
      });
    });
  });

  // =====================================================
  // create
  // =====================================================

  describe('create', () => {
    it('inserts into planned_cycles table', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseSuccess(mockPlannedCycle)
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
      });

      await plannedCyclesService.create(mockCreateInput);

      expect(supabase.from).toHaveBeenCalledWith('planned_cycles');
      expect(mockInsert).toHaveBeenCalledWith(mockCreateInput);
    });

    it('returns the created planned cycle on success', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseSuccess(mockPlannedCycle)
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
      });

      const result = await plannedCyclesService.create(mockCreateInput);

      expect(result).toEqual(mockPlannedCycle);
      expect(result.id).toBe('cycle-001');
      expect(result.status).toBe('draft');
    });

    it('sends select * and single after insert', async () => {
      const { mockInsert, mockSelect, mockSingle } = mockInsertChain(
        mockSupabaseSuccess(mockPlannedCycle)
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
      });

      await plannedCyclesService.create(mockCreateInput);

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockSingle).toHaveBeenCalledTimes(1);
    });

    it('throws when the insert fails', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('violates not-null constraint')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        plannedCyclesService.create(mockCreateInput)
      ).rejects.toMatchObject({ message: 'violates not-null constraint' });
    });

    it('throws when RLS rejects the insert', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('new row violates row-level security policy')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        plannedCyclesService.create(mockCreateInput)
      ).rejects.toBeTruthy();
    });
  });

  // =====================================================
  // update
  // =====================================================

  describe('update', () => {
    const cycleId = 'cycle-001';
    const updateInput = { planned_plant_count: 75, status: 'committed' as const };

    it('updates the planned_cycles table filtered by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess(mockPlannedCycle)
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
      });

      await plannedCyclesService.update(cycleId, updateInput);

      expect(supabase.from).toHaveBeenCalledWith('planned_cycles');
      expect(mockUpdate).toHaveBeenCalledWith(updateInput);
      expect(mockEq).toHaveBeenCalledWith('id', cycleId);
    });

    it('returns the updated planned cycle on success', async () => {
      const updated = { ...mockPlannedCycle, planned_plant_count: 75, status: 'committed' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(updated));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
      });

      const result = await plannedCyclesService.update(cycleId, updateInput);

      expect(result.planned_plant_count).toBe(75);
      expect(result.status).toBe('committed');
    });

    it('accepts partial update input', async () => {
      const partialInput = { notes: 'Updated notes' };
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockPlannedCycle, notes: 'Updated notes' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
      });

      await plannedCyclesService.update(cycleId, partialInput);

      expect(mockUpdate).toHaveBeenCalledWith(partialInput);
    });

    it('throws when the update fails', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Record not found')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
      });

      await expect(
        plannedCyclesService.update(cycleId, updateInput)
      ).rejects.toMatchObject({ message: 'Record not found' });
    });
  });

  // =====================================================
  // delete
  // =====================================================

  describe('delete', () => {
    const cycleId = 'cycle-001';

    it('deletes from planned_cycles filtered by id', async () => {
      const { mockDelete, mockEq } = mockDeleteChain(
        mockSupabaseSuccess(null)
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        delete: mockDelete,
      });

      await plannedCyclesService.delete(cycleId);

      expect(supabase.from).toHaveBeenCalledWith('planned_cycles');
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockEq).toHaveBeenCalledWith('id', cycleId);
    });

    it('resolves without returning a value on success', async () => {
      const { mockDelete } = mockDeleteChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        delete: mockDelete,
      });

      const result = await plannedCyclesService.delete(cycleId);

      expect(result).toBeUndefined();
    });

    it('throws when the delete fails', async () => {
      const { mockDelete } = mockDeleteChain(
        mockSupabaseError('foreign key constraint violation')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        delete: mockDelete,
      });

      await expect(plannedCyclesService.delete(cycleId)).rejects.toMatchObject({
        message: 'foreign key constraint violation',
      });
    });

    it('throws when cycle does not exist', async () => {
      const { mockDelete } = mockDeleteChain(
        mockSupabaseError('no rows deleted')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        delete: mockDelete,
      });

      await expect(
        plannedCyclesService.delete('nonexistent-id')
      ).rejects.toBeTruthy();
    });
  });
});
