import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseError } from '../../../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

function mockUpdateChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq, mockSelect, mockSingle };
}

function mockInsertChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockInsert, mockSelect, mockSingle };
}

describe('cultivationService — error path coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('archiveGrowRoom', () => {
    it('propagates FK error when room has active plant groups', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('update or delete on table "grow_rooms" violates foreign key constraint', '23503')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.archiveGrowRoom('room-with-plants')).rejects.toThrow(
        'foreign key constraint'
      );
    });

    it('propagates error when room is not found', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Row not found', 'PGRST116'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.archiveGrowRoom('nonexistent')).rejects.toThrow('Row not found');
    });
  });

  describe('archiveDryRoom', () => {
    it('propagates error when dry room is not found', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Row not found', 'PGRST116'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.archiveDryRoom('nonexistent')).rejects.toThrow('Row not found');
    });
  });

  describe('advanceStage — stage transition edge cases', () => {
    it('throws when skipping directly to "harvested" — DB check constraint', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'new row for relation "plant_groups" violates check constraint "plant_groups_harvested_only_from_flower"',
          '23514'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-001', 'harvested')).rejects.toThrow('check constraint');
    });

    it('throws when skipping veg stage (clone → flower) — DB trigger blocks it', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot advance stage: skipping stages is not allowed', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-001', 'flower')).rejects.toThrow(
        'Cannot advance stage'
      );
    });
  });

  describe('createHarvestSession — plant group stage validation', () => {
    const input = {
      plant_group_id: 'pg-clone',
      harvest_date: '2026-02-19',
      wet_weight_grams: 5000,
      plant_count_harvested: 50,
    };

    it('throws when plant group is not in flower stage — DB trigger blocks it', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Cannot create harvest session: plant group must be in "flower" stage', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(cultivationService.createHarvestSession(input)).rejects.toThrow(
        'plant group must be in "flower" stage'
      );
    });

    it('throws when plant group is already harvested', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('Cannot create harvest session: plant group is already in "harvested" stage', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createHarvestSession({ ...input, plant_group_id: 'pg-harvested' })
      ).rejects.toThrow('plant group is already in "harvested" stage');
    });

    it('throws when wet_weight_grams is zero or negative — DB check constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('violates check constraint "harvest_sessions_wet_weight_positive"', '23514')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createHarvestSession({ ...input, wet_weight_grams: -100 })
      ).rejects.toThrow('check constraint');
    });
  });

  describe('completeHarvestSession — status guard', () => {
    it('throws when session is already completed', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot complete harvest session: session is already in "completed" status', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeHarvestSession('hs-done')).rejects.toThrow(
        'already in "completed" status'
      );
    });

    it('throws when session has been cancelled', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot complete harvest session: session has been cancelled', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeHarvestSession('hs-cancelled')).rejects.toThrow(
        'session has been cancelled'
      );
    });
  });

  describe('cancelHarvestSession — double-cancel guard', () => {
    it('throws when attempting to cancel an already-cancelled session', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot cancel harvest session: session is already cancelled', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.cancelHarvestSession('hs-already-cancelled')).rejects.toThrow(
        'already cancelled'
      );
    });
  });

  describe('completeBinningSession — status guard', () => {
    it('throws when binning session is already completed', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot complete binning session: session is already in "completed" status', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeBinningSession('bs-done')).rejects.toThrow(
        'already in "completed" status'
      );
    });

    it('throws when binning session has been cancelled', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot complete binning session: session has been cancelled', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.completeBinningSession('bs-cancelled')).rejects.toThrow(
        'session has been cancelled'
      );
    });
  });

  describe('cancelBinningSession — double-cancel guard', () => {
    it('throws when attempting to cancel an already-cancelled binning session', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot cancel binning session: session is already cancelled', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.cancelBinningSession('bs-already-cancelled')).rejects.toThrow(
        'already cancelled'
      );
    });
  });

  describe('moveToRoom — room availability checks', () => {
    it('throws when target room is archived — DB trigger blocks it', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot move plant group to an archived room', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.moveToRoom('pg-001', 'room-archived')).rejects.toThrow(
        'Cannot move plant group to an archived room'
      );
    });

    it('throws when target room FK is invalid', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('violates foreign key constraint "plant_groups_grow_room_id_fkey"', '23503')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.moveToRoom('pg-001', 'nonexistent-room')).rejects.toThrow(
        'foreign key constraint'
      );
    });
  });

  describe('adjustHarvestWeight — session state guard', () => {
    it('throws when adjusting weight on a cancelled session', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot adjust weight: harvest session is cancelled', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(
        cultivationService.adjustHarvestWeight('hs-cancelled', 4800, 'Correction')
      ).rejects.toThrow('harvest session is cancelled');
    });
  });

  describe('setMotherStatus — harvested group guard', () => {
    it('throws when attempting to set mother status on a harvested group', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('Cannot set mother status: plant group is already harvested', 'P0001')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.setMotherStatus('pg-harvested', true)).rejects.toThrow(
        'plant group is already harvested'
      );
    });
  });
});
