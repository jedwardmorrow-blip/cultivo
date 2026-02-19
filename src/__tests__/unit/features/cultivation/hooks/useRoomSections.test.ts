import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRoomSections } from '@/features/cultivation/hooks/useRoomSections';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makeRoomTable, makeRoomSection } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    listRoomTables: vi.fn(),
    createRoomTable: vi.fn(),
    updateRoomTable: vi.fn(),
    archiveRoomTable: vi.fn(),
    createRoomSection: vi.fn(),
    updateRoomSection: vi.fn(),
    archiveRoomSection: vi.fn(),
  },
}));

const mockListTables = cultivationService.listRoomTables as ReturnType<typeof vi.fn>;
const mockCreateTable = cultivationService.createRoomTable as ReturnType<typeof vi.fn>;
const mockUpdateTable = cultivationService.updateRoomTable as ReturnType<typeof vi.fn>;
const mockArchiveTable = cultivationService.archiveRoomTable as ReturnType<typeof vi.fn>;
const mockCreateSection = cultivationService.createRoomSection as ReturnType<typeof vi.fn>;
const mockUpdateSection = cultivationService.updateRoomSection as ReturnType<typeof vi.fn>;
const mockArchiveSection = cultivationService.archiveRoomSection as ReturnType<typeof vi.fn>;

describe('useRoomSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call service when growRoomId is null', () => {
    renderHook(() => useRoomSections(null));
    expect(mockListTables).not.toHaveBeenCalled();
  });

  it('returns empty tables array when growRoomId is null', () => {
    const { result } = renderHook(() => useRoomSections(null));
    expect(result.current.tables).toEqual([]);
  });

  it('fetches tables when growRoomId is provided', async () => {
    const tables = [makeRoomTable()];
    mockListTables.mockResolvedValue(tables);

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListTables).toHaveBeenCalledWith('room-001', { includeArchived: false });
    expect(result.current.tables).toEqual(tables);
  });

  it('sets error on load failure', async () => {
    mockListTables.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load room layout');
  });

  it('reloads when growRoomId changes', async () => {
    mockListTables.mockResolvedValue([makeRoomTable()]);

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useRoomSections(id),
      { initialProps: { id: 'room-001' } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListTables).toHaveBeenCalledTimes(1);

    rerender({ id: 'room-002' });
    await waitFor(() => expect(mockListTables).toHaveBeenCalledTimes(2));
    expect(mockListTables).toHaveBeenLastCalledWith('room-002', { includeArchived: false });
  });

  it('hasSections is true when at least one table has sections', async () => {
    const section = makeRoomSection();
    const table = makeRoomTable({ sections: [section] });
    mockListTables.mockResolvedValue([table]);

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasSections).toBe(true);
  });

  it('hasSections is false when no sections exist', async () => {
    mockListTables.mockResolvedValue([makeRoomTable({ sections: [] })]);

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasSections).toBe(false);
  });

  it('allSections flattens sections from all tables', async () => {
    const s1 = makeRoomSection({ id: 's1', room_table_id: 'table-001' });
    const s2 = makeRoomSection({ id: 's2', room_table_id: 'table-002' });
    mockListTables.mockResolvedValue([
      makeRoomTable({ id: 'table-001', sections: [s1] }),
      makeRoomTable({ id: 'table-002', sections: [s2] }),
    ]);

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allSections).toHaveLength(2);
  });

  it('createTable calls service and reloads', async () => {
    mockListTables.mockResolvedValue([]);
    mockCreateTable.mockResolvedValue(makeRoomTable());

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createTable({ grow_room_id: 'room-001', table_number: 1 });
    });

    expect(mockCreateTable).toHaveBeenCalledTimes(1);
    expect(mockListTables).toHaveBeenCalledTimes(2);
  });

  it('updateTable calls service and reloads', async () => {
    mockListTables.mockResolvedValue([makeRoomTable()]);
    mockUpdateTable.mockResolvedValue(makeRoomTable({ table_name: 'Updated' }));

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateTable('table-001', { table_name: 'Updated' });
    });

    expect(mockUpdateTable).toHaveBeenCalledWith('table-001', { table_name: 'Updated' });
    expect(mockListTables).toHaveBeenCalledTimes(2);
  });

  it('archiveTable calls service and reloads', async () => {
    mockListTables.mockResolvedValue([makeRoomTable()]);
    mockArchiveTable.mockResolvedValue(makeRoomTable({ is_active: false }));

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.archiveTable('table-001');
    });

    expect(mockArchiveTable).toHaveBeenCalledWith('table-001');
    expect(mockListTables).toHaveBeenCalledTimes(2);
  });

  it('createSection calls service and reloads', async () => {
    mockListTables.mockResolvedValue([]);
    mockCreateSection.mockResolvedValue(makeRoomSection());

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSection({ room_table_id: 'table-001', section_label: 'A1' });
    });

    expect(mockCreateSection).toHaveBeenCalledTimes(1);
    expect(mockListTables).toHaveBeenCalledTimes(2);
  });

  it('updateSection calls service and reloads', async () => {
    mockListTables.mockResolvedValue([]);
    mockUpdateSection.mockResolvedValue(makeRoomSection({ flip_date: '2026-03-01' }));

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSection('section-001', { flip_date: '2026-03-01' });
    });

    expect(mockUpdateSection).toHaveBeenCalledWith('section-001', { flip_date: '2026-03-01' });
    expect(mockListTables).toHaveBeenCalledTimes(2);
  });

  it('archiveSection calls service and reloads', async () => {
    mockListTables.mockResolvedValue([]);
    mockArchiveSection.mockResolvedValue(makeRoomSection({ is_active: false }));

    const { result } = renderHook(() => useRoomSections('room-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.archiveSection('section-001');
    });

    expect(mockArchiveSection).toHaveBeenCalledWith('section-001');
    expect(mockListTables).toHaveBeenCalledTimes(2);
  });
});
