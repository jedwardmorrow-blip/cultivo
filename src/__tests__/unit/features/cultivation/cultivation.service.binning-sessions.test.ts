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

const mockBinningSession = {
  id: 'bs-001',
  harvest_session_id: 'hs-001',
  dry_room_id: 'dry-001',
  batch_registry_id: 'batch-001',
  dry_weight_grams: 3500,
  bin_date: '2026-02-19',
  session_status: 'active' as const,
  completed_at: null,
  completed_by: null,
  cancelled_at: null,
  cancelled_by: null,
  notes: null,
  created_at: new Date().toISOString(),
  created_by: 'user-123',
  harvest_sessions: {
    harvest_date: '2026-02-19',
    wet_weight_grams: 5000,
    adjusted_weight_grams: null,
    plant_groups: {
      group_number: 'PG-260101-001',
      strains: { name: 'Blue Pave', abbreviation: 'BP' },
    },
  },
  dry_rooms: { name: 'Dry Room 1', room_code: 'DR-1' },
  batch_registry: { batch_number: '260219-BP' },
};

const mockCompletedBinningSession = {
  ...mockBinningSession,
  session_status: 'completed' as const,
  completed_at: new Date().toISOString(),
  completed_by: 'user-123',
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

describe('cultivationService — binning sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // listBinningSessions
  // =====================================================

  describe('listBinningSessions', () => {
    it('queries binning_sessions and returns results ordered by bin_date', async () => {
      const { mockSelect, mockOrder } = mockListChain(mockSupabaseSuccess([mockBinningSession]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listBinningSessions();

      expect(supabase.from).toHaveBeenCalledWith('binning_sessions');
      expect(mockOrder).toHaveBeenCalledWith('bin_date', { ascending: false });
      expect(result).toEqual([mockBinningSession]);
    });

    it('filters by status when provided', async () => {
      const { mockSelect, mockEqFilter } = mockListChain(mockSupabaseSuccess([mockCompletedBinningSession]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listBinningSessions({ status: 'completed' });

      expect(mockEqFilter).toHaveBeenCalledWith('session_status', 'completed');
    });

    it('throws on database error', async () => {
      const { mockSelect } = mockListChain(mockSupabaseError('Query failed'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listBinningSessions()).rejects.toThrow('Query failed');
    });
  });

  // =====================================================
  // createBinningSession (Scenarios 18, 19, 20, 21)
  // =====================================================

  describe('createBinningSession', () => {
    const validInput = {
      harvest_session_id: 'hs-001',
      dry_room_id: 'dry-001',
      batch_registry_id: 'batch-001',
      dry_weight_grams: 3500,
      bin_date: '2026-02-19',
    };

    it('inserts into binning_sessions with session_status: "active"', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createBinningSession(validInput);

      expect(supabase.from).toHaveBeenCalledWith('binning_sessions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          harvest_session_id: 'hs-001',
          dry_room_id: 'dry-001',
          batch_registry_id: 'batch-001',
          dry_weight_grams: 3500,
          session_status: 'active',
        })
      );
    });

    it('sets created_by to current user', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createBinningSession(validInput);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 'user-123' })
      );
    });

    it('returns the created binning session on success', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const result = await cultivationService.createBinningSession(validInput);

      expect(result).toEqual(mockBinningSession);
    });

    it('(Scenario 18) throws when harvest session is not completed — DB trigger blocks it', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError(
          'Cannot create binning session: harvest session must be in "completed" status',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createBinningSession({ ...validInput, harvest_session_id: 'hs-active' })
      ).rejects.toThrow('harvest session must be in "completed" status');
    });

    it('(Scenario 19) throws when a binning session already exists for this harvest — DB unique constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError(
          'duplicate key value violates unique constraint "binning_sessions_harvest_session_id_key"',
          '23505'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createBinningSession(validInput)
      ).rejects.toThrow('duplicate key value');
    });

    it('(Scenario 20) throws when batch_registry_id does not match harvest session batch — DB trigger blocks it', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError(
          'batch_registry_id must match the batch created from this harvest session',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createBinningSession({ ...validInput, batch_registry_id: 'wrong-batch' })
      ).rejects.toThrow('batch_registry_id must match');
    });

    it('(Scenario 21) throws when dry_weight_grams is zero or negative — DB check constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError(
          'new row for relation "binning_sessions" violates check constraint "binning_sessions_dry_weight_positive"',
          '23514'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createBinningSession({ ...validInput, dry_weight_grams: 0 })
      ).rejects.toThrow('check constraint');
    });
  });

  // =====================================================
  // completeBinningSession (Scenario 24)
  // =====================================================

  describe('completeBinningSession', () => {
    it('sets session_status to "completed" and completed_at timestamp', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.completeBinningSession('bs-001');

      expect(supabase.from).toHaveBeenCalledWith('binning_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          session_status: 'completed',
          completed_at: expect.any(String),
          completed_by: 'user-123',
        })
      );
    });

    it('targets the correct binning session by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(mockCompletedBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.completeBinningSession('bs-001');

      expect(mockEq).toHaveBeenCalledWith('id', 'bs-001');
    });

    it('(Scenario 24) returns the completed session so UI can read final dry_weight_grams', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockCompletedBinningSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.completeBinningSession('bs-001');

      expect(result.session_status).toBe('completed');
      expect(result.dry_weight_grams).toBe(3500);
    });

    it('throws on database error', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Row not found'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeBinningSession('bs-001')).rejects.toThrow('Row not found');
    });
  });

  // =====================================================
  // cancelBinningSession (Scenario 22)
  // =====================================================

  describe('cancelBinningSession', () => {
    it('sets session_status to "cancelled" and cancelled_at timestamp', async () => {
      const cancelledSession = { ...mockBinningSession, session_status: 'cancelled' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelledSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.cancelBinningSession('bs-001');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          session_status: 'cancelled',
          cancelled_at: expect.any(String),
          cancelled_by: 'user-123',
        })
      );
    });

    it('(Scenario 22) throws when cancelling an already-completed binning session — DB trigger blocks it', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'Cannot cancel binning session: session is already completed',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.cancelBinningSession('bs-completed')).rejects.toThrow(
        'Cannot cancel binning session'
      );
    });

    it('returns the cancelled session on success', async () => {
      const cancelledSession = { ...mockBinningSession, session_status: 'cancelled' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(cancelledSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.cancelBinningSession('bs-001');

      expect(result.session_status).toBe('cancelled');
    });
  });

  // =====================================================
  // listUnbinnedHarvestSessions
  // =====================================================

  describe('listUnbinnedHarvestSessions', () => {
    it('first queries binning_sessions for already-binned harvest IDs', async () => {
      const mockBinnedOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockBinnedNot = vi.fn().mockReturnValue({ order: mockBinnedOrder });
      const mockBinnedSelect = vi.fn().mockReturnValue({ not: mockBinnedNot });

      const mockHarvestOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockHarvestEq = vi.fn().mockReturnValue({ order: mockHarvestOrder });
      const mockHarvestSelect = vi.fn().mockReturnValue({ eq: mockHarvestEq });

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockBinnedSelect })
        .mockReturnValueOnce({ select: mockHarvestSelect });

      await cultivationService.listUnbinnedHarvestSessions();

      expect(supabase.from).toHaveBeenNthCalledWith(1, 'binning_sessions');
      expect(supabase.from).toHaveBeenNthCalledWith(2, 'harvest_sessions');
    });

    it('only returns completed harvest sessions', async () => {
      const mockBinnedOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockBinnedNot = vi.fn().mockReturnValue({ order: mockBinnedOrder });
      const mockBinnedSelect = vi.fn().mockReturnValue({ not: mockBinnedNot });

      const mockHarvestOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockHarvestEq = vi.fn().mockReturnValue({ order: mockHarvestOrder });
      const mockHarvestSelect = vi.fn().mockReturnValue({ eq: mockHarvestEq });

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockBinnedSelect })
        .mockReturnValueOnce({ select: mockHarvestSelect });

      await cultivationService.listUnbinnedHarvestSessions();

      expect(mockHarvestEq).toHaveBeenCalledWith('session_status', 'completed');
    });

    it('throws when the binning_sessions query fails', async () => {
      const mockBinnedNot = vi.fn().mockResolvedValue(mockSupabaseError('DB error'));
      const mockBinnedSelect = vi.fn().mockReturnValue({ not: mockBinnedNot });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce({ select: mockBinnedSelect });

      await expect(cultivationService.listUnbinnedHarvestSessions()).rejects.toThrow('DB error');
    });
  });
});
