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

const mockPlantGroup = {
  id: 'pg-001',
  group_number: 'PG-260101-001',
  name: 'Test Group',
  strain_id: 'strain-001',
  grow_room_id: 'room-001',
  mother_plant_group_id: null,
  room_table_id: null,
  room_section_id: null,
  is_mother: false,
  plant_count: 50,
  growth_stage: 'clone' as const,
  stage_entered_at: new Date().toISOString(),
  planted_date: null,
  notes: null,
  created_at: new Date().toISOString(),
  created_by: 'user-123',
  updated_at: new Date().toISOString(),
  strains: { name: 'Blue Pave', abbreviation: 'BP' },
  grow_rooms: { name: 'Clone Room', room_code: 'CR-1' },
};

function mockSelectOrderChain(resolvedValue: unknown) {
  const mockOrder = vi.fn().mockResolvedValue(resolvedValue);
  const mockNot = vi.fn().mockReturnValue({ order: mockOrder });
  const mockEqFilter = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({
    order: mockOrder,
    not: mockNot,
    eq: mockEqFilter,
  });
  return { mockSelect, mockOrder, mockNot, mockEqFilter };
}

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

function mockSingleSelectChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockSelect, mockEq, mockSingle };
}

describe('cultivationService — plant groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // listPlantGroups
  // =====================================================

  describe('listPlantGroups', () => {
    it('queries plant_groups and returns results', async () => {
      const { mockSelect } = mockSelectOrderChain(mockSupabaseSuccess([mockPlantGroup]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listPlantGroups();

      expect(supabase.from).toHaveBeenCalledWith('plant_groups');
      expect(result).toEqual([mockPlantGroup]);
    });

    it('filters by stage when provided', async () => {
      const { mockSelect, mockEqFilter } = mockSelectOrderChain(mockSupabaseSuccess([mockPlantGroup]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listPlantGroups({ stage: 'clone' });

      expect(mockEqFilter).toHaveBeenCalledWith('growth_stage', 'clone');
    });

    it('excludes harvested groups when filtering for "active"', async () => {
      const { mockSelect, mockNot } = mockSelectOrderChain(mockSupabaseSuccess([mockPlantGroup]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listPlantGroups({ stage: 'active' });

      expect(mockNot).toHaveBeenCalledWith('growth_stage', 'eq', 'harvested');
    });

    it('throws on database error', async () => {
      const { mockSelect } = mockSelectOrderChain(mockSupabaseError('Connection timeout'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listPlantGroups()).rejects.toThrow('Connection timeout');
    });
  });

  // =====================================================
  // createPlantGroup (Scenarios 7, 9)
  // =====================================================

  describe('createPlantGroup', () => {
    const input = {
      strain_id: 'strain-001',
      grow_room_id: 'room-001',
      plant_count: 50,
    };

    it('inserts with group_number: "PENDING" and growth_stage: "clone"', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockPlantGroup));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createPlantGroup(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          group_number: 'PENDING',
          growth_stage: 'clone',
          strain_id: 'strain-001',
          grow_room_id: 'room-001',
          plant_count: 50,
        })
      );
    });

    it('(Scenario 7) throws when strain_id FK is invalid — DB FK constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError(
          'insert or update on table "plant_groups" violates foreign key constraint "plant_groups_strain_id_fkey"',
          '23503'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createPlantGroup({ ...input, strain_id: 'nonexistent-strain' })
      ).rejects.toThrow('foreign key constraint');
    });

    it('(Scenario 9) throws when strain abbreviation is missing — DB check constraint', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError(
          'new row for relation "plant_groups" violates check constraint "plant_groups_require_strain_abbreviation"',
          '23514'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createPlantGroup({ ...input, strain_id: 'strain-no-abbrev' })
      ).rejects.toThrow('check constraint');
    });

    it('defaults is_mother to false when not provided', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(mockPlantGroup));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createPlantGroup(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ is_mother: false })
      );
    });

    it('(Scenario 16) accepts mother_plant_group_id when creating a cutting group', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess({ ...mockPlantGroup, mother_plant_group_id: 'pg-mother' }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createPlantGroup({ ...input, mother_plant_group_id: 'pg-mother' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ mother_plant_group_id: 'pg-mother' })
      );
    });
  });

  // =====================================================
  // advanceStage (Scenarios 1, 2, 13)
  // =====================================================

  describe('advanceStage', () => {
    it('(Scenario 1) updates growth_stage to the target stage', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockPlantGroup, growth_stage: 'veg' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.advanceStage('pg-001', 'veg');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ growth_stage: 'veg' })
      );
    });

    it('(Scenario 1) targets the correct plant group by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockPlantGroup, growth_stage: 'flower' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.advanceStage('pg-001', 'flower');

      expect(mockEq).toHaveBeenCalledWith('id', 'pg-001');
    });

    it('(Scenario 1) returns the updated plant group on success', async () => {
      const updated = { ...mockPlantGroup, growth_stage: 'veg' as const };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(updated));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.advanceStage('pg-001', 'veg');

      expect(result.growth_stage).toBe('veg');
    });

    it('(Scenario 2) throws when DB trigger blocks backward stage transition', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'new row for relation "plant_groups" violates check constraint "plant_groups_no_backward_stage"',
          '23514'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-001', 'clone')).rejects.toThrow(
        'check constraint'
      );
    });

    it('(Scenario 13) throws when attempting to advance a harvested group', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'Cannot advance stage: plant group is already harvested',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-001', 'flower')).rejects.toThrow(
        'Cannot advance stage'
      );
    });

    it('throws on general database error', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Permission denied'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.advanceStage('pg-001', 'veg')).rejects.toThrow(
        'Permission denied'
      );
    });
  });

  // =====================================================
  // moveToRoom (Scenarios 11, 12)
  // =====================================================

  describe('moveToRoom', () => {
    it('(Scenario 11) updates grow_room_id to the target room', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockPlantGroup, grow_room_id: 'room-002' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.moveToRoom('pg-001', 'room-002');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ grow_room_id: 'room-002' })
      );
    });

    it('(Scenario 11) targets the correct plant group by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(mockPlantGroup));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.moveToRoom('pg-001', 'room-002');

      expect(mockEq).toHaveBeenCalledWith('id', 'pg-001');
    });

    it('(Scenario 12) throws when moving a harvested group — DB trigger blocks it', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError(
          'Cannot move harvested plant group to a new room',
          'P0001'
        )
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.moveToRoom('pg-001', 'room-002')).rejects.toThrow(
        'Cannot move harvested plant group'
      );
    });

    it('returns the updated plant group on success', async () => {
      const updated = { ...mockPlantGroup, grow_room_id: 'room-002' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(updated));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.moveToRoom('pg-001', 'room-002');

      expect(result.grow_room_id).toBe('room-002');
    });
  });

  // =====================================================
  // getPlantGroup
  // =====================================================

  describe('getPlantGroup', () => {
    it('fetches a single plant group by id', async () => {
      const { mockSelect, mockEq } = mockSingleSelectChain(mockSupabaseSuccess(mockPlantGroup));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.getPlantGroup('pg-001');

      expect(supabase.from).toHaveBeenCalledWith('plant_groups');
      expect(mockEq).toHaveBeenCalledWith('id', 'pg-001');
    });

    it('throws when the plant group does not exist', async () => {
      const { mockSelect } = mockSingleSelectChain(mockSupabaseError('Row not found', 'PGRST116'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.getPlantGroup('nonexistent')).rejects.toThrow('Row not found');
    });
  });

  // =====================================================
  // setMotherStatus
  // =====================================================

  describe('setMotherStatus', () => {
    it('updates is_mother on the plant group', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ ...mockPlantGroup, is_mother: true })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.setMotherStatus('pg-001', true);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_mother: true }));
    });

    it('throws on database error', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('Update failed'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(cultivationService.setMotherStatus('pg-001', true)).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // listMotherGroups
  // =====================================================

  describe('listMotherGroups', () => {
    it('filters for is_mother = true and excludes harvested groups', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([mockPlantGroup]));
      const mockNot = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqFilter = vi.fn().mockReturnValue({ not: mockNot });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFilter });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listMotherGroups();

      expect(supabase.from).toHaveBeenCalledWith('plant_groups');
      expect(mockEqFilter).toHaveBeenCalledWith('is_mother', true);
      expect(mockNot).toHaveBeenCalledWith('growth_stage', 'eq', 'harvested');
    });
  });
});
