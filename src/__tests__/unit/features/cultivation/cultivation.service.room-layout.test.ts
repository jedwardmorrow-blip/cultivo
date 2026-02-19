import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';
import { makeRoomTable, makeRoomSection } from '../../../fixtures/cultivationFixtures';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

function mockSelectEqOrderChain(resolvedValue: unknown) {
  const mockEqActive = vi.fn().mockResolvedValue(resolvedValue);
  const mockOrder = vi.fn().mockReturnValue({ eq: mockEqActive });
  const mockEqRoom = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEqRoom });
  return { mockSelect, mockEqRoom, mockEqActive, mockOrder };
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

function mockUpdateInEqChain(resolvedValue: unknown) {
  const mockEq = vi.fn().mockResolvedValue(resolvedValue);
  const mockIn = vi.fn().mockReturnValue({ eq: mockEq });
  const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
  return { mockUpdate, mockIn, mockEq };
}

describe('cultivationService — room layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // listRoomTables
  // =====================================================

  describe('listRoomTables', () => {
    it('queries room_tables scoped to the given grow_room_id', async () => {
      const table = makeRoomTable({ sections: [] });
      const { mockSelect, mockEqRoom } = mockSelectEqOrderChain(mockSupabaseSuccess([table]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listRoomTables('room-001');

      expect(supabase.from).toHaveBeenCalledWith('room_tables');
      expect(mockEqRoom).toHaveBeenCalledWith('grow_room_id', 'room-001');
    });

    it('filters to active tables only when includeArchived is false (default)', async () => {
      const table = makeRoomTable({ sections: [] });
      const { mockSelect, mockEqActive } = mockSelectEqOrderChain(mockSupabaseSuccess([table]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listRoomTables('room-001');

      expect(mockEqActive).toHaveBeenCalledWith('is_active', true);
    });

    it('sorts sections by section_label within each table', async () => {
      const sectionB = makeRoomSection({ id: 's-b', section_label: 'B1' });
      const sectionA = makeRoomSection({ id: 's-a', section_label: 'A1' });
      const tableWithSections = makeRoomTable({ sections: [sectionB, sectionA] });
      const { mockSelect } = mockSelectEqOrderChain(mockSupabaseSuccess([tableWithSections]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listRoomTables('room-001');

      expect(result[0].sections[0].section_label).toBe('A1');
      expect(result[0].sections[1].section_label).toBe('B1');
    });

    it('excludes archived sections from results by default', async () => {
      const activeSection = makeRoomSection({ id: 's-active', is_active: true });
      const archivedSection = makeRoomSection({ id: 's-archived', is_active: false });
      const table = makeRoomTable({ sections: [activeSection, archivedSection] });
      const { mockSelect } = mockSelectEqOrderChain(mockSupabaseSuccess([table]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listRoomTables('room-001');

      expect(result[0].sections).toHaveLength(1);
      expect(result[0].sections[0].id).toBe('s-active');
    });

    it('returns empty array when room has no tables', async () => {
      const { mockSelect } = mockSelectEqOrderChain(mockSupabaseSuccess([]));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const result = await cultivationService.listRoomTables('room-empty');

      expect(result).toEqual([]);
    });

    it('throws on database error', async () => {
      const { mockSelect } = mockSelectEqOrderChain(mockSupabaseError('Permission denied'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listRoomTables('room-001')).rejects.toThrow('Permission denied');
    });
  });

  // =====================================================
  // createRoomTable
  // =====================================================

  describe('createRoomTable', () => {
    it('inserts into room_tables with is_active: true and created_by from auth', async () => {
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(makeRoomTable()));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createRoomTable({ grow_room_id: 'room-001', table_number: 1 });

      expect(supabase.from).toHaveBeenCalledWith('room_tables');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          grow_room_id: 'room-001',
          table_number: 1,
          is_active: true,
          created_by: 'user-123',
        })
      );
    });

    it('returns the created table with an empty sections array', async () => {
      const tableData = { id: 'table-new', grow_room_id: 'room-001', table_number: 2, table_name: null, total_sqft: null, is_active: true, created_at: '2026-01-01T00:00:00Z', created_by: 'user-123' };
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(tableData));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      const result = await cultivationService.createRoomTable({ grow_room_id: 'room-001', table_number: 2 });

      expect(result.sections).toEqual([]);
    });

    it('throws on FK violation when grow_room_id is invalid', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('violates foreign key constraint "room_tables_grow_room_id_fkey"', '23503')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createRoomTable({ grow_room_id: 'bad-room', table_number: 1 })
      ).rejects.toThrow('foreign key constraint');
    });
  });

  // =====================================================
  // updateRoomTable / archiveRoomTable
  // =====================================================

  describe('updateRoomTable', () => {
    it('updates by id and returns with empty sections array', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess(makeRoomTable({ table_name: 'Updated' })));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cultivationService.updateRoomTable('table-001', { table_name: 'Updated' });

      expect(mockEq).toHaveBeenCalledWith('id', 'table-001');
      expect(result.sections).toEqual([]);
    });
  });

  describe('archiveRoomTable', () => {
    it('sets is_active: false on the table', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(makeRoomTable({ is_active: false })));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.archiveRoomTable('table-001');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });
  });

  // =====================================================
  // createRoomSection
  // =====================================================

  describe('createRoomSection', () => {
    it('inserts into room_sections with is_active: true and created_by', async () => {
      const section = makeRoomSection();
      const { mockInsert } = mockInsertChain(mockSupabaseSuccess(section));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await cultivationService.createRoomSection({ room_table_id: 'table-001', section_label: 'A1' });

      expect(supabase.from).toHaveBeenCalledWith('room_sections');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          room_table_id: 'table-001',
          section_label: 'A1',
          is_active: true,
          created_by: 'user-123',
        })
      );
    });

    it('throws on FK violation when room_table_id is invalid', async () => {
      const { mockInsert } = mockInsertChain(
        mockSupabaseError('violates foreign key constraint "room_sections_room_table_id_fkey"', '23503')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await expect(
        cultivationService.createRoomSection({ room_table_id: 'bad-table', section_label: 'A1' })
      ).rejects.toThrow('foreign key constraint');
    });
  });

  // =====================================================
  // updateRoomSection / archiveRoomSection
  // =====================================================

  describe('updateRoomSection', () => {
    it('updates flip_date and projected_harvest_date', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(makeRoomSection({ flip_date: '2026-03-01' })));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.updateRoomSection('section-001', { flip_date: '2026-03-01', projected_harvest_date: '2026-05-01' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ flip_date: '2026-03-01', projected_harvest_date: '2026-05-01' })
      );
    });
  });

  describe('archiveRoomSection', () => {
    it('sets is_active: false on the section', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(makeRoomSection({ is_active: false })));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.archiveRoomSection('section-001');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });
  });

  // =====================================================
  // flipRoom
  // =====================================================

  describe('flipRoom', () => {
    it('updates sections flip_date for all active tables in the room', async () => {
      const tableListSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess([{ id: 'table-001' }, { id: 'table-002' }])),
        }),
      });
      const { mockUpdate: sectionUpdate, mockIn, mockEq: sectionEq } = mockUpdateInEqChain(mockSupabaseSuccess(null));
      const groupSelectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: tableListSelect })
        .mockReturnValueOnce({ update: sectionUpdate })
        .mockReturnValueOnce({ select: groupSelectFn });

      await cultivationService.flipRoom({ grow_room_id: 'room-001', flip_date: '2026-03-01' });

      expect(mockIn).toHaveBeenCalledWith('room_table_id', ['table-001', 'table-002']);
      expect(sectionEq).toHaveBeenCalledWith('is_active', true);
    });

    it('skips section update when room has no active tables', async () => {
      const tableListSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });
      const groupSelectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: tableListSelect })
        .mockReturnValueOnce({ select: groupSelectFn });

      await expect(
        cultivationService.flipRoom({ grow_room_id: 'room-empty', flip_date: '2026-03-01' })
      ).resolves.not.toThrow();
    });
  });

  // =====================================================
  // listPlantGroupsByRoom
  // =====================================================

  describe('listPlantGroupsByRoom', () => {
    it('queries plant_groups scoped to the given room', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await cultivationService.listPlantGroupsByRoom('room-001');

      expect(supabase.from).toHaveBeenCalledWith('plant_groups');
      expect(mockEq).toHaveBeenCalledWith('grow_room_id', 'room-001');
    });

    it('throws on database error', async () => {
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseError('DB error'));
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      await expect(cultivationService.listPlantGroupsByRoom('room-001')).rejects.toThrow('DB error');
    });
  });

  // =====================================================
  // updatePlantGroupNotes
  // =====================================================

  describe('updatePlantGroupNotes', () => {
    it('updates only the notes field (no other fields)', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess({ id: 'pg-001', notes: 'New notes' }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.updatePlantGroupNotes('pg-001', 'New notes');

      expect(mockUpdate).toHaveBeenCalledWith({ notes: 'New notes' });
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ growth_stage: expect.anything() })
      );
    });

    it('targets the correct plant group by id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(mockSupabaseSuccess({ id: 'pg-001', notes: 'notes' }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cultivationService.updatePlantGroupNotes('pg-001', 'notes');

      expect(mockEq).toHaveBeenCalledWith('id', 'pg-001');
    });
  });
});
