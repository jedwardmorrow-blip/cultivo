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

const mockGrowRoom = {
  id: 'room-001',
  name: 'Flower Room A',
  room_code: 'FR-A',
  room_type: 'flower' as const,
  capacity_plants: 100,
  is_active: true,
  created_at: new Date().toISOString(),
  created_by: 'user-123',
};

const mockDryRoom = {
  id: 'dry-001',
  name: 'Dry Room 1',
  room_code: 'DR-1',
  capacity_lbs: 50,
  is_active: true,
  created_at: new Date().toISOString(),
  created_by: 'user-123',
};

function mockSelectChain(resolvedValue: unknown) {
  const mockOrder = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  return { mockSelect, mockOrder };
}

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

describe('cultivationService — grow rooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // listGrowRooms
  // =====================================================

  describe('listGrowRooms', () => {
    it('queries the grow_rooms table ordered by room_code', async () => {
      const { mockSelect, mockOrder } = mockSelectChain(mockSupabaseSuccess([mockGrowRoom]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listGrowRooms();

      expect(supabase.from).toHaveBeenCalledWith('grow_rooms');
      expect(mockOrder).toHaveBeenCalledWith('room_code');
    });

    it('returns an array of grow rooms on success', async () => {
      const { mockSelect } = mockSelectChain(mockSupabaseSuccess([mockGrowRoom]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listGrowRooms();

      expect(result).toEqual([mockGrowRoom]);
    });

    it('throws when the database returns an error', async () => {
      const { mockSelect } = mockSelectChain(mockSupabaseError('Database unavailable'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listGrowRooms()).rejects.toThrow('Database unavailable');
    });
  });

  // =====================================================
  // createGrowRoom
  // =====================================================

  describe('createGrowRoom', () => {
    const input = { name: 'Veg Room A', room_code: 'VG-A', room_type: 'veg' as const };

    it('inserts into grow_rooms with is_active: true', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockGrowRoom));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createGrowRoom(input);

      expect(supabase.from).toHaveBeenCalledWith('grow_rooms');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Veg Room A', room_code: 'VG-A', is_active: true })
      );
    });

    it('returns the created grow room on success', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockGrowRoom));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const result = await cultivationService.createGrowRoom(input);

      expect(result).toEqual(mockGrowRoom);
    });

    it('throws on database error', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseError('unique violation'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(cultivationService.createGrowRoom(input)).rejects.toThrow('unique violation');
    });

    it('(Scenario 8) throws when room_code is already taken — DB unique constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('duplicate key value violates unique constraint "grow_rooms_room_code_key"', '23505')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createGrowRoom({ name: 'Duplicate Room', room_code: 'FR-A', room_type: 'flower' })
      ).rejects.toThrow('duplicate key value');
    });
  });

  // =====================================================
  // updateGrowRoom
  // =====================================================

  describe('updateGrowRoom', () => {
    it('updates the correct grow room by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(mockGrowRoom));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.updateGrowRoom('room-001', { name: 'Updated Name' });

      expect(supabase.from).toHaveBeenCalledWith('grow_rooms');
      expect(mockEq).toHaveBeenCalledWith('id', 'room-001');
    });

    it('returns the updated grow room on success', async () => {
      const updated = { ...mockGrowRoom, name: 'Updated Name' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(updated));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.updateGrowRoom('room-001', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('throws on database error', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Permission denied'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(
        cultivationService.updateGrowRoom('room-001', { name: 'X' })
      ).rejects.toThrow('Permission denied');
    });
  });

  // =====================================================
  // archiveGrowRoom
  // =====================================================

  describe('archiveGrowRoom', () => {
    it('sets is_active: false on the room', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess({ ...mockGrowRoom, is_active: false }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.archiveGrowRoom('room-001');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });
  });

  // =====================================================
  // listDryRooms
  // =====================================================

  describe('listDryRooms', () => {
    it('queries the dry_rooms table ordered by room_code', async () => {
      const { mockSelect, mockOrder } = mockSelectChain(mockSupabaseSuccess([mockDryRoom]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listDryRooms();

      expect(supabase.from).toHaveBeenCalledWith('dry_rooms');
      expect(mockOrder).toHaveBeenCalledWith('room_code');
    });

    it('returns an array of dry rooms on success', async () => {
      const { mockSelect } = mockSelectChain(mockSupabaseSuccess([mockDryRoom]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listDryRooms();

      expect(result).toEqual([mockDryRoom]);
    });

    it('throws on database error', async () => {
      const { mockSelect } = mockSelectChain(mockSupabaseError('Table not found'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listDryRooms()).rejects.toThrow('Table not found');
    });
  });

  // =====================================================
  // createDryRoom
  // =====================================================

  describe('createDryRoom', () => {
    const input = { name: 'Dry Room 2', room_code: 'DR-2', capacity_lbs: 75 };

    it('inserts into dry_rooms with is_active: true', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockDryRoom));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createDryRoom(input);

      expect(supabase.from).toHaveBeenCalledWith('dry_rooms');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Dry Room 2', room_code: 'DR-2', is_active: true })
      );
    });

    it('returns the created dry room on success', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockDryRoom));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const result = await cultivationService.createDryRoom(input);

      expect(result).toEqual(mockDryRoom);
    });

    it('(Scenario 23) throws when dry_room_code is already taken — DB unique constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('duplicate key value violates unique constraint "dry_rooms_room_code_key"', '23505')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createDryRoom({ name: 'Duplicate', room_code: 'DR-1' })
      ).rejects.toThrow('duplicate key value');
    });
  });

  // =====================================================
  // updateDryRoom
  // =====================================================

  describe('updateDryRoom', () => {
    it('updates the correct dry room by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(mockDryRoom));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.updateDryRoom('dry-001', { name: 'Updated Dry Room' });

      expect(supabase.from).toHaveBeenCalledWith('dry_rooms');
      expect(mockEq).toHaveBeenCalledWith('id', 'dry-001');
    });

    it('returns the updated dry room on success', async () => {
      const updated = { ...mockDryRoom, name: 'Updated Dry Room' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(updated));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.updateDryRoom('dry-001', { name: 'Updated Dry Room' });

      expect(result.name).toBe('Updated Dry Room');
    });
  });

  // =====================================================
  // archiveDryRoom
  // =====================================================

  describe('archiveDryRoom', () => {
    it('sets is_active: false on the dry room', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess({ ...mockDryRoom, is_active: false }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.archiveDryRoom('dry-001');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });
  });
});
