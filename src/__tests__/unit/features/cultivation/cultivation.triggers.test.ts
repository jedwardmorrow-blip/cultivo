/**
 * Cultivation Trigger Behavior Tests
 *
 * These tests verify the service-layer contracts that correspond to
 * database trigger-enforced invariants in the cultivation module.
 *
 * Covered trigger scenarios:
 *   T1  — Stage machine: clone → veg → flower only (no skipping, no reversals)
 *   T2  — Harvest blocked without 3-letter strain abbreviation
 *   T3  — Harvest blocked if plant group is not in flower stage
 *   T4  — Batch auto-created on harvest session completion (batch_registry_id set)
 *   T5  — Cancellation blocked for harvest session with an active batch
 *   T6  — Binning session requires a completed (non-cancelled) harvest session
 *   T7  — Binning session requires a batch_registry_id on the harvest
 *   T8  — Stage history recorded on every stage transition
 *   T9  — Room history recorded on every room move
 *   T10 — Flip room advances eligible groups to flower stage
 *   T11 — listUnbinnedHarvestSessions excludes sessions with active/completed binning records
 *   T12 — advanceStage to 'harvested' is blocked via service layer (use harvest sessions instead)
 *   T13 — completeHarvestSession requires wet_weight_grams > 0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

const mockGroupClone = {
  id: 'pg-001',
  group_number: 'PG-260101-001',
  strain_id: 'strain-001',
  grow_room_id: 'room-001',
  growth_stage: 'clone' as const,
  plant_count: 50,
  is_mother: false,
  stage_entered_at: '2026-01-01T00:00:00Z',
  planted_date: '2026-01-01',
  strains: { id: 'strain-001', name: 'Blue Pave', abbreviation: 'BPV' },
  grow_rooms: { id: 'room-001', name: 'Clone Room', room_code: 'CR-1', room_type: 'clone' },
};

const mockGroupFlower = {
  ...mockGroupClone,
  growth_stage: 'flower' as const,
  grow_rooms: { id: 'room-002', name: 'Flower Room A', room_code: 'FR-A', room_type: 'flower' },
};

const mockGroupNoAbbrev = {
  ...mockGroupFlower,
  strains: { id: 'strain-002', name: 'Unknown Strain', abbreviation: null },
};

const mockHarvestSession = {
  id: 'hs-001',
  plant_group_id: 'pg-001',
  harvest_date: '2026-02-19',
  wet_weight_grams: 5000,
  plant_count_harvested: 50,
  session_status: 'active' as const,
  batch_registry_id: null,
  adjusted_weight_grams: null,
  adjustment_reason: null,
  notes: null,
  created_at: '2026-02-19T00:00:00Z',
  created_by: 'user-123',
  completed_at: null,
  completed_by: null,
  cancelled_at: null,
  cancelled_by: null,
  plant_groups: {
    group_number: 'PG-260101-001',
    strains: { name: 'Blue Pave', abbreviation: 'BPV' },
  },
  batch_registry: null,
};

const mockCompletedHarvest = {
  ...mockHarvestSession,
  session_status: 'completed' as const,
  batch_registry_id: 'batch-001',
  completed_at: '2026-02-19T12:00:00Z',
  completed_by: 'user-123',
  batch_registry: { batch_number: '260219-BPV' },
};

function mockInsertChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockInsert, mockSelect, mockSingle };
}

function mockUpdateChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq, mockSelect, mockSingle };
}

function mockListChain(resolvedValue: unknown) {
  const mockOrder = vi.fn().mockResolvedValue(resolvedValue);
  const mockEqFilter = vi.fn().mockReturnValue({ order: mockOrder });
  const mockNotFilter = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder, eq: mockEqFilter, not: mockNotFilter });
  return { mockSelect, mockOrder, mockEqFilter, mockNotFilter };
}

describe('Cultivation trigger invariants — service-layer contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // T1 — Stage machine: clone → veg → flower only (no skipping, no reversals)
  // ===========================================================================

  describe('T1 — Stage machine enforcement', () => {
    it('clone → veg: valid advance is forwarded to the database', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockGroupClone, growth_stage: 'veg', stage_entered_at: new Date().toISOString() })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.advanceStage('pg-001', 'veg');

      expect(supabase.from).toHaveBeenCalledWith('plant_groups');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ growth_stage: 'veg' })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'pg-001');
      expect(result.growth_stage).toBe('veg');
    });

    it('veg → flower: valid advance is forwarded to the database', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockGroupClone, growth_stage: 'flower', stage_entered_at: new Date().toISOString() })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.advanceStage('pg-001', 'flower');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ growth_stage: 'flower' })
      );
      expect(result.growth_stage).toBe('flower');
    });

    it('stage advance sends only growth_stage to the DB — stage_entered_at is set by trigger', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockGroupClone, growth_stage: 'veg', stage_entered_at: new Date().toISOString() })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.advanceStage('pg-001', 'veg');

      const callArg = (mockUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.growth_stage).toBe('veg');
      expect(callArg.stage_entered_at).toBeUndefined();
    });

    it('database rejects illegal stage skip (clone → flower) — trigger fires check constraint', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('new row for relation "plant_groups" violates check constraint "valid_stage_transition"', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-001', 'flower')).rejects.toThrow(
        'valid_stage_transition'
      );
    });

    it('database rejects stage reversal (flower → veg) — trigger fires check constraint', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('new row for relation "plant_groups" violates check constraint "valid_stage_transition"', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-flower-001', 'veg')).rejects.toThrow(
        'valid_stage_transition'
      );
    });

    it('database rejects advancing a harvested group — trigger fires check constraint', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot advance stage of a harvested plant group', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-harvested', 'flower')).rejects.toThrow(
        'Cannot advance stage'
      );
    });
  });

  // ===========================================================================
  // T2 — Harvest blocked without 3-letter strain abbreviation
  // ===========================================================================

  describe('T2 — Harvest requires valid strain abbreviation', () => {
    it('database rejects harvest when strain has no abbreviation — trigger error C-12', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Strain must have a 3-letter abbreviation before harvesting (C-12)', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const input = {
        plant_group_id: mockGroupNoAbbrev.id,
        harvest_date: '2026-02-19',
        wet_weight_grams: 5000,
        plant_count_harvested: 50,
      };

      await expect(cultivationService.createHarvestSession(input)).rejects.toThrow('C-12');
    });

    it('database rejects harvest when abbreviation is not exactly 3 uppercase letters', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Abbreviation must match [A-Z]{3} (C-12)', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const input = {
        plant_group_id: 'pg-bad-abbrev',
        harvest_date: '2026-02-19',
        wet_weight_grams: 5000,
        plant_count_harvested: 50,
      };

      await expect(cultivationService.createHarvestSession(input)).rejects.toThrow('C-12');
    });

    it('harvest succeeds when strain has a valid 3-letter abbreviation', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockHarvestSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const input = {
        plant_group_id: mockGroupFlower.id,
        harvest_date: '2026-02-19',
        wet_weight_grams: 5000,
        plant_count_harvested: 50,
      };

      const result = await cultivationService.createHarvestSession(input);
      expect(result.id).toBe('hs-001');
    });
  });

  // ===========================================================================
  // T3 — Harvest blocked if plant group is not in flower stage
  // ===========================================================================

  describe('T3 — Harvest requires flower-stage plant group', () => {
    it('database rejects harvest of a clone-stage group — trigger error C-13', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Plant group must be in flower stage to harvest (C-13)', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const input = {
        plant_group_id: mockGroupClone.id,
        harvest_date: '2026-02-19',
        wet_weight_grams: 5000,
        plant_count_harvested: 50,
      };

      await expect(cultivationService.createHarvestSession(input)).rejects.toThrow('C-13');
    });

    it('database rejects harvest of a veg-stage group', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Plant group must be in flower stage to harvest (C-13)', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createHarvestSession({
          plant_group_id: 'pg-veg-001',
          harvest_date: '2026-02-19',
          wet_weight_grams: 5000,
          plant_count_harvested: 50,
        })
      ).rejects.toThrow('C-13');
    });

    it('database rejects harvest of an already-harvested group', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Plant group must be in flower stage to harvest (C-13)', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createHarvestSession({
          plant_group_id: 'pg-harvested-001',
          harvest_date: '2026-02-19',
          wet_weight_grams: 5000,
          plant_count_harvested: 50,
        })
      ).rejects.toThrow('C-13');
    });
  });

  // ===========================================================================
  // T4 — Batch auto-created on harvest session completion
  // ===========================================================================

  describe('T4 — Harvest completion creates a batch record', () => {
    it('completeHarvestSession updates status to completed', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(mockCompletedHarvest));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.completeHarvestSession('hs-001');

      expect(supabase.from).toHaveBeenCalledWith('harvest_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ session_status: 'completed' })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'hs-001');
    });

    it('completed harvest session has batch_registry_id populated (trigger creates batch)', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedHarvest));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.completeHarvestSession('hs-001');

      expect(result.batch_registry_id).toBe('batch-001');
      expect(result.session_status).toBe('completed');
    });

    it('completed harvest session has a batch number via batch_registry relation', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedHarvest));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.completeHarvestSession('hs-001');

      expect(result.batch_registry?.batch_number).toMatch(/^\d{6}-[A-Z]{3}$/);
    });

    it('completeHarvestSession records completed_by user id', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedHarvest));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.completeHarvestSession('hs-001');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ completed_by: 'user-123' })
      );
    });
  });

  // ===========================================================================
  // T5 — Cancellation blocked for harvest session with an active batch
  // ===========================================================================

  describe('T5 — Cannot cancel harvest session with an active batch', () => {
    it('database rejects cancellation when a batch exists for the harvest', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot cancel harvest session: an active batch already exists for this harvest', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.cancelHarvestSession('hs-completed-001')).rejects.toThrow(
        'Cannot cancel harvest session'
      );
    });

    it('cancellation succeeds for an active session with no batch yet', async () => {
      const cancelled = { ...mockHarvestSession, session_status: 'cancelled' as const, cancelled_at: new Date().toISOString(), cancelled_by: 'user-123' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelled));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.cancelHarvestSession('hs-001');

      expect(result.session_status).toBe('cancelled');
    });

    it('cancelHarvestSession sends session_status: cancelled to the database', async () => {
      const cancelled = { ...mockHarvestSession, session_status: 'cancelled' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelled));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.cancelHarvestSession('hs-001');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ session_status: 'cancelled' })
      );
    });
  });

  // ===========================================================================
  // T6 — Binning session requires a completed (non-cancelled) harvest session
  // ===========================================================================

  describe('T6 — Binning requires a completed harvest session', () => {
    it('database rejects binning linked to an active harvest session', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Binning session can only reference a completed harvest session', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createBinningSession({
          harvest_session_id: 'hs-active-001',
          dry_room_id: 'dry-001',
          batch_registry_id: 'batch-001',
          dry_weight_grams: 3500,
          bin_date: '2026-02-20',
        })
      ).rejects.toThrow('completed harvest session');
    });

    it('database rejects binning linked to a cancelled harvest session', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Binning session can only reference a completed harvest session', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createBinningSession({
          harvest_session_id: 'hs-cancelled-001',
          dry_room_id: 'dry-001',
          batch_registry_id: 'batch-001',
          dry_weight_grams: 3500,
          bin_date: '2026-02-20',
        })
      ).rejects.toThrow('completed harvest session');
    });
  });

  // ===========================================================================
  // T7 — Binning session requires a batch_registry_id
  // ===========================================================================

  describe('T7 — Binning session requires a batch reference', () => {
    it('service layer: createBinningSession sends batch_registry_id in the insert payload', async () => {
      const mockBinningSession = {
        id: 'bs-001', harvest_session_id: 'hs-001', dry_room_id: 'dry-001',
        batch_registry_id: 'batch-001', dry_weight_grams: 3500, bin_date: '2026-02-20',
        session_status: 'active' as const, created_at: new Date().toISOString(), created_by: 'user-123',
        completed_at: null, completed_by: null, cancelled_at: null, cancelled_by: null, notes: null,
      };
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createBinningSession({
        harvest_session_id: 'hs-001',
        dry_room_id: 'dry-001',
        batch_registry_id: 'batch-001',
        dry_weight_grams: 3500,
        bin_date: '2026-02-20',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ batch_registry_id: 'batch-001' })
      );
    });

    it('createBinningSession sets session_status: active on creation', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess({
        id: 'bs-001', session_status: 'active', batch_registry_id: 'batch-001',
        harvest_session_id: 'hs-001', dry_room_id: 'dry-001', dry_weight_grams: 3500,
        bin_date: '2026-02-20', created_at: new Date().toISOString(), created_by: 'user-123',
        completed_at: null, completed_by: null, cancelled_at: null, cancelled_by: null, notes: null,
      }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createBinningSession({
        harvest_session_id: 'hs-001',
        dry_room_id: 'dry-001',
        batch_registry_id: 'batch-001',
        dry_weight_grams: 3500,
        bin_date: '2026-02-20',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ session_status: 'active' })
      );
    });
  });

  // ===========================================================================
  // T8 — Stage history recorded on every stage transition
  // ===========================================================================

  describe('T8 — Stage history is queryable after transitions', () => {
    it('getStageHistory queries plant_group_stage_history for the given group', async () => {
      const mockHistory = [
        { id: 'sh-001', plant_group_id: 'pg-001', from_stage: 'clone', to_stage: 'veg', changed_at: new Date().toISOString(), changed_by: 'user-123' },
        { id: 'sh-002', plant_group_id: 'pg-001', from_stage: 'veg', to_stage: 'flower', changed_at: new Date().toISOString(), changed_by: 'user-123' },
      ];
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess(mockHistory));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.getStageHistory('pg-001');

      expect(supabase.from).toHaveBeenCalledWith('plant_group_stage_history');
      expect(mockEq).toHaveBeenCalledWith('plant_group_id', 'pg-001');
      expect(result).toHaveLength(2);
      expect(result[0].from_stage).toBe('clone');
      expect(result[0].to_stage).toBe('veg');
    });

    it('getStageHistory returns empty array when no transitions have occurred', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.getStageHistory('pg-new-001');

      expect(result).toEqual([]);
    });

    it('getStageHistory throws when database returns an error', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseError('Permission denied'));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.getStageHistory('pg-001')).rejects.toThrow('Permission denied');
    });
  });

  // ===========================================================================
  // T9 — Room history recorded on every room move
  // ===========================================================================

  describe('T9 — Room history is queryable after moves', () => {
    it('getRoomHistory queries plant_group_room_history for the given group', async () => {
      const mockHistory = [
        { id: 'rh-001', plant_group_id: 'pg-001', from_room_id: 'room-001', to_room_id: 'room-002', moved_at: new Date().toISOString(), moved_by: 'user-123',
          from_room: { name: 'Clone Room', room_code: 'CR-1' },
          to_room: { name: 'Flower Room A', room_code: 'FR-A' } },
      ];
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess(mockHistory));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.getRoomHistory('pg-001');

      expect(supabase.from).toHaveBeenCalledWith('plant_group_room_history');
      expect(mockEq).toHaveBeenCalledWith('plant_group_id', 'pg-001');
      expect(result).toHaveLength(1);
      expect(result[0].to_room?.room_code).toBe('FR-A');
    });

    it('getRoomHistory returns empty array when group has never been moved', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.getRoomHistory('pg-new-001');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // T10 — Flip room advances eligible groups to flower stage
  // ===========================================================================

  describe('T10 — Flip room operation', () => {
    it('flipRoom queries room_tables for the given grow_room_id', async () => {
      const mockEqActive = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEqRoom = vi.fn().mockReturnValue({ eq: mockEqActive });
      const mockSelectTables = vi.fn().mockReturnValue({ eq: mockEqRoom });

      const mockNotGroups = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEqGroups = vi.fn().mockReturnValue({ not: mockNotGroups });
      const mockSelectGroups = vi.fn().mockReturnValue({ eq: mockEqGroups });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'room_tables') return { select: mockSelectTables };
        return { select: mockSelectGroups };
      });

      await cultivationService.flipRoom({ grow_room_id: 'room-001', flip_date: '2026-02-19' });

      expect(supabase.from).toHaveBeenCalledWith('room_tables');
      expect(mockEqRoom).toHaveBeenCalledWith('grow_room_id', 'room-001');
      expect(mockEqActive).toHaveBeenCalledWith('is_active', true);
    });

    it('flipRoom queries plant_groups not in flower or harvested stage', async () => {
      const mockEqActive = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEqRoom = vi.fn().mockReturnValue({ eq: mockEqActive });
      const mockSelectTables = vi.fn().mockReturnValue({ eq: mockEqRoom });

      const mockNotGroups = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEqGroups = vi.fn().mockReturnValue({ not: mockNotGroups });
      const mockSelectGroups = vi.fn().mockReturnValue({ eq: mockEqGroups });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'room_tables') return { select: mockSelectTables };
        return { select: mockSelectGroups };
      });

      await cultivationService.flipRoom({ grow_room_id: 'room-001', flip_date: '2026-02-19' });

      expect(supabase.from).toHaveBeenCalledWith('plant_groups');
      expect(mockNotGroups).toHaveBeenCalledWith('growth_stage', 'in', '("flower","harvested")');
    });

    it('flipRoom throws when room_tables query returns an error', async () => {
      const mockEqActive = vi.fn().mockResolvedValue(mockSupabaseError('Room not found'));
      const mockEqRoom = vi.fn().mockReturnValue({ eq: mockEqActive });
      const mockSelectTables = vi.fn().mockReturnValue({ eq: mockEqRoom });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({ select: mockSelectTables }));

      await expect(
        cultivationService.flipRoom({ grow_room_id: 'nonexistent-room', flip_date: '2026-02-19' })
      ).rejects.toThrow('Room not found');
    });
  });

  // ===========================================================================
  // T11 — listUnbinnedHarvestSessions excludes already-binned sessions
  // ===========================================================================

  describe('T11 — Unbinned harvest sessions list', () => {
    it('first queries binning_sessions to get binned harvest IDs', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockNotFilter = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqFilter = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelectHarvest = vi.fn().mockReturnValue({ eq: mockEqFilter, not: mockNotFilter, order: mockOrder });
      const mockSelectBinned = vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
      });

      let callIdx = 0;
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        callIdx++;
        if (table === 'binning_sessions') return { select: mockSelectBinned };
        return { select: mockSelectHarvest };
      });

      await cultivationService.listUnbinnedHarvestSessions();

      expect(supabase.from).toHaveBeenCalledWith('binning_sessions');
      expect(supabase.from).toHaveBeenCalledWith('harvest_sessions');
    });

    it('when no binned sessions exist, queries all completed harvest sessions', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([mockCompletedHarvest]));
      const mockEqFilter = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelectHarvest = vi.fn().mockReturnValue({ eq: mockEqFilter, order: mockOrder });
      const mockSelectBinned = vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'binning_sessions') return { select: mockSelectBinned };
        return { select: mockSelectHarvest };
      });

      const result = await cultivationService.listUnbinnedHarvestSessions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hs-001');
    });

    it('when binned IDs exist, uses .not() filter to exclude them', async () => {
      const binnedIds = [{ harvest_session_id: 'hs-binned-001' }, { harvest_session_id: 'hs-binned-002' }];
      const mockOrderFinal = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockNotFilter = vi.fn().mockReturnValue({ order: mockOrderFinal });
      const mockEqFilter = vi.fn().mockReturnValue({ order: mockOrderFinal, not: mockNotFilter });
      const mockSelectHarvest = vi.fn().mockReturnValue({ eq: mockEqFilter, not: mockNotFilter });
      const mockSelectBinned = vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue(mockSupabaseSuccess(binnedIds)),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'binning_sessions') return { select: mockSelectBinned };
        return { select: mockSelectHarvest };
      });

      await cultivationService.listUnbinnedHarvestSessions();

      expect(mockNotFilter).toHaveBeenCalledWith(
        'id',
        'in',
        expect.stringContaining('hs-binned-001')
      );
    });

    it('UUID exclusion list uses quoted format: ("uuid1","uuid2")', async () => {
      const binnedIds = [{ harvest_session_id: 'abc-123' }];
      const mockOrderFinal = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockNotFilter = vi.fn().mockReturnValue({ order: mockOrderFinal });
      const mockEqFilter = vi.fn().mockReturnValue({ order: mockOrderFinal, not: mockNotFilter });
      const mockSelectHarvest = vi.fn().mockReturnValue({ eq: mockEqFilter, not: mockNotFilter });
      const mockSelectBinned = vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue(mockSupabaseSuccess(binnedIds)),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'binning_sessions') return { select: mockSelectBinned };
        return { select: mockSelectHarvest };
      });

      await cultivationService.listUnbinnedHarvestSessions();

      const notCall = (mockNotFilter as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(notCall[2]).toBe('("abc-123")');
    });
  });

  // ===========================================================================
  // T12 — advanceStage to 'harvested' is blocked via service layer
  // ===========================================================================

  describe('T12 — Advancing to harvested stage is DB-enforced (harvest sessions path required)', () => {
    it('database rejects direct advance to harvested stage', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot set plant_groups.growth_stage to "harvested" directly — use harvest sessions', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(
        cultivationService.advanceStage('pg-flower-001', 'harvested')
      ).rejects.toThrow('harvested');
    });
  });

  // ===========================================================================
  // T13 — completeHarvestSession requires wet_weight_grams > 0
  // ===========================================================================

  describe('T13 — Harvest session weight validation', () => {
    it('createHarvestSession sends wet_weight_grams in the insert payload', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockHarvestSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createHarvestSession({
        plant_group_id: mockGroupFlower.id,
        harvest_date: '2026-02-19',
        wet_weight_grams: 5000,
        plant_count_harvested: 50,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ wet_weight_grams: 5000 })
      );
    });

    it('database rejects harvest with wet_weight_grams = 0', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('wet_weight_grams must be greater than 0', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createHarvestSession({
          plant_group_id: mockGroupFlower.id,
          harvest_date: '2026-02-19',
          wet_weight_grams: 0,
          plant_count_harvested: 50,
        })
      ).rejects.toThrow('wet_weight_grams');
    });

    it('adjustHarvestWeight updates the adjusted_weight_grams and reason fields', async () => {
      const adjusted = { ...mockCompletedHarvest, adjusted_weight_grams: 4800, adjustment_reason: 'Scale re-calibrated' };
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(adjusted));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.adjustHarvestWeight('hs-001', 4800, 'Scale re-calibrated');

      expect(supabase.from).toHaveBeenCalledWith('harvest_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          adjusted_weight_grams: 4800,
          adjustment_reason: 'Scale re-calibrated',
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'hs-001');
      expect(result.adjusted_weight_grams).toBe(4800);
    });

    it('adjustHarvestWeight throws if database rejects the update', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Cannot adjust weight of a cancelled session'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(
        cultivationService.adjustHarvestWeight('hs-cancelled', 4800, 'Correction')
      ).rejects.toThrow('Cannot adjust weight');
    });
  });
});
