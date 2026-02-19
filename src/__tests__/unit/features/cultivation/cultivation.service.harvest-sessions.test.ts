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

const mockHarvestSession = {
  id: 'hs-001',
  plant_group_id: 'pg-001',
  harvest_date: '2026-02-19',
  wet_weight_grams: 5000,
  plant_count_harvested: 50,
  adjusted_weight_grams: null,
  adjustment_reason: null,
  batch_registry_id: null,
  session_status: 'active' as const,
  completed_at: null,
  completed_by: null,
  cancelled_at: null,
  cancelled_by: null,
  notes: null,
  created_at: new Date().toISOString(),
  created_by: 'user-123',
  plant_groups: {
    group_number: 'PG-260101-001',
    strain_id: 'strain-001',
    grow_room_id: 'room-001',
    strains: { name: 'Blue Pave', abbreviation: 'BP' },
    grow_rooms: { room_code: 'FR-A' },
  },
  batch_registry: null,
};

const mockCompletedSession = {
  ...mockHarvestSession,
  session_status: 'completed' as const,
  completed_at: new Date().toISOString(),
  completed_by: 'user-123',
  batch_registry_id: 'batch-001',
  batch_registry: { batch_number: '260219-BP' },
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
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder, eq: mockEqFilter });
  return { mockSelect, mockOrder, mockEqFilter };
}

describe('cultivationService — harvest sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // listHarvestSessions
  // =====================================================

  describe('listHarvestSessions', () => {
    it('queries harvest_sessions and returns results ordered by harvest_date', async () => {
      const { mockSelect, mockOrder } = mockListChain(mockSupabaseSuccess([mockHarvestSession]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listHarvestSessions();

      expect(supabase.from).toHaveBeenCalledWith('harvest_sessions');
      expect(mockOrder).toHaveBeenCalledWith('harvest_date', { ascending: false });
      expect(result).toEqual([mockHarvestSession]);
    });

    it('filters by status when provided', async () => {
      const { mockSelect, mockEqFilter } = mockListChain(mockSupabaseSuccess([mockCompletedSession]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listHarvestSessions({ status: 'completed' });

      expect(mockEqFilter).toHaveBeenCalledWith('session_status', 'completed');
    });

    it('throws on database error', async () => {
      const { mockSelect } = mockListChain(mockSupabaseError('Query failed'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listHarvestSessions()).rejects.toThrow('Query failed');
    });
  });

  // =====================================================
  // createHarvestSession
  // =====================================================

  describe('createHarvestSession', () => {
    const input = {
      plant_group_id: 'pg-001',
      harvest_date: '2026-02-19',
      wet_weight_grams: 5000,
      plant_count_harvested: 50,
    };

    it('inserts into harvest_sessions with session_status: "active"', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockHarvestSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createHarvestSession(input);

      expect(supabase.from).toHaveBeenCalledWith('harvest_sessions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          plant_group_id: 'pg-001',
          wet_weight_grams: 5000,
          session_status: 'active',
        })
      );
    });

    it('returns the created harvest session on success', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockHarvestSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const result = await cultivationService.createHarvestSession(input);

      expect(result).toEqual(mockHarvestSession);
    });

    it('throws when plant_group FK is invalid', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('foreign key constraint "harvest_sessions_plant_group_id_fkey"', '23503')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(cultivationService.createHarvestSession(input)).rejects.toThrow('foreign key constraint');
    });
  });

  // =====================================================
  // completeHarvestSession (Scenarios 3, 4, 10)
  // =====================================================

  describe('completeHarvestSession', () => {
    it('(Scenario 3) sets session_status to "completed" and completed_by to current user', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.completeHarvestSession('hs-001');

      expect(supabase.from).toHaveBeenCalledWith('harvest_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          session_status: 'completed',
          completed_by: 'user-123',
        })
      );
    });

    it('(Scenario 3) targets the correct session by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(mockCompletedSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.completeHarvestSession('hs-001');

      expect(mockEq).toHaveBeenCalledWith('id', 'hs-001');
    });

    it('(Scenario 3) returns the completed session with batch_registry_id populated by trigger', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.completeHarvestSession('hs-001');

      expect(result.session_status).toBe('completed');
      expect(result.batch_registry_id).toBe('batch-001');
    });

    it('(Scenario 4) when same strain+date batch exists, trigger links to it instead of creating new', async () => {
      const existingBatchSession = { ...mockCompletedSession, batch_registry_id: 'existing-batch-001' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(existingBatchSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.completeHarvestSession('hs-002');

      expect(result.batch_registry_id).toBe('existing-batch-001');
    });

    it('(Scenario 10) throws when strain abbreviation is missing — DB trigger blocks batch creation', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'Cannot create batch: strain abbreviation is required for batch_number generation',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeHarvestSession('hs-001')).rejects.toThrow(
        'strain abbreviation is required'
      );
    });

    it('throws on general database error', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Row-level security violation'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeHarvestSession('hs-001')).rejects.toThrow(
        'Row-level security violation'
      );
    });
  });

  // =====================================================
  // cancelHarvestSession (Scenarios 5, 6)
  // =====================================================

  describe('cancelHarvestSession', () => {
    it('(Scenario 5) sets session_status to "cancelled" on an active session', async () => {
      const cancelledSession = { ...mockHarvestSession, session_status: 'cancelled' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelledSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.cancelHarvestSession('hs-001');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ session_status: 'cancelled' })
      );
    });

    it('(Scenario 5) sets cancelled_by to current user', async () => {
      const cancelledSession = { ...mockHarvestSession, session_status: 'cancelled' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelledSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.cancelHarvestSession('hs-001');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ cancelled_by: 'user-123' })
      );
    });

    it('(Scenario 6) throws when cancelling a completed session that has a batch — DB trigger blocks it', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'Cannot cancel harvest session: batch already created from this session',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.cancelHarvestSession('hs-001')).rejects.toThrow(
        'Cannot cancel harvest session'
      );
    });

    it('returns the cancelled session on success', async () => {
      const cancelledSession = { ...mockHarvestSession, session_status: 'cancelled' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelledSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.cancelHarvestSession('hs-001');

      expect(result.session_status).toBe('cancelled');
    });
  });

  // =====================================================
  // adjustHarvestWeight (Scenarios 14, 15)
  // =====================================================

  describe('adjustHarvestWeight', () => {
    it('(Scenario 14) updates adjusted_weight_grams and adjustment_reason', async () => {
      const adjusted = { ...mockCompletedSession, adjusted_weight_grams: 4800, adjustment_reason: 'Corrected measurement' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(adjusted));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.adjustHarvestWeight('hs-001', 4800, 'Corrected measurement');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          adjusted_weight_grams: 4800,
          adjustment_reason: 'Corrected measurement',
        })
      );
    });

    it('(Scenario 14) targets the correct session by id', async () => {
      const adjusted = { ...mockCompletedSession, adjusted_weight_grams: 4800 };
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(adjusted));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.adjustHarvestWeight('hs-001', 4800, 'Reason');

      expect(mockEq).toHaveBeenCalledWith('id', 'hs-001');
    });

    it('(Scenario 14) returns the updated session with adjusted weight', async () => {
      const adjusted = { ...mockCompletedSession, adjusted_weight_grams: 4800 };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(adjusted));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.adjustHarvestWeight('hs-001', 4800, 'Reason');

      expect(result.adjusted_weight_grams).toBe(4800);
    });

    it('(Scenario 15) throws when DB rejects adjustment without a reason', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'new row for relation "harvest_sessions" violates check constraint "harvest_sessions_adjustment_requires_reason"',
          '23514'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.adjustHarvestWeight('hs-001', 4800, '')).rejects.toThrow(
        'check constraint'
      );
    });

    it('throws on general database error', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Deadlock detected'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.adjustHarvestWeight('hs-001', 4800, 'Reason')).rejects.toThrow(
        'Deadlock detected'
      );
    });
  });
});
