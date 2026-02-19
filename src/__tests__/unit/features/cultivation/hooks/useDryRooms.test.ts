import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDryRooms } from '@/features/cultivation/hooks/useDryRooms';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makeDryRoom } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    listDryRooms: vi.fn(),
    createDryRoom: vi.fn(),
    updateDryRoom: vi.fn(),
    archiveDryRoom: vi.fn(),
  },
}));

const mockList = cultivationService.listDryRooms as ReturnType<typeof vi.fn>;
const mockCreate = cultivationService.createDryRoom as ReturnType<typeof vi.fn>;
const mockUpdate = cultivationService.updateDryRoom as ReturnType<typeof vi.fn>;
const mockArchive = cultivationService.archiveDryRoom as ReturnType<typeof vi.fn>;

describe('useDryRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading and fetches dry rooms on mount', async () => {
    const rooms = [makeDryRoom()];
    mockList.mockResolvedValue(rooms);

    const { result } = renderHook(() => useDryRooms());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rooms).toEqual(rooms);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('activeRooms filters out inactive dry rooms', async () => {
    mockList.mockResolvedValue([
      makeDryRoom({ id: 'dr1', is_active: true }),
      makeDryRoom({ id: 'dr2', is_active: false }),
    ]);

    const { result } = renderHook(() => useDryRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeRooms).toHaveLength(1);
    expect(result.current.activeRooms[0].id).toBe('dr1');
  });

  it('sets error message on load failure', async () => {
    mockList.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useDryRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load dry rooms');
  });

  it('createRoom calls service then reloads', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(makeDryRoom({ id: 'dr-new' }));

    const { result } = renderHook(() => useDryRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createRoom({ name: 'New Dry Room', room_code: 'NDR' });
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('updateRoom calls service then reloads', async () => {
    mockList.mockResolvedValue([makeDryRoom()]);
    mockUpdate.mockResolvedValue(makeDryRoom({ name: 'Updated' }));

    const { result } = renderHook(() => useDryRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateRoom('dry-001', { name: 'Updated' });
    });

    expect(mockUpdate).toHaveBeenCalledWith('dry-001', { name: 'Updated' });
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('archiveRoom calls service then reloads', async () => {
    mockList.mockResolvedValue([makeDryRoom()]);
    mockArchive.mockResolvedValue(makeDryRoom({ is_active: false }));

    const { result } = renderHook(() => useDryRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.archiveRoom('dry-001');
    });

    expect(mockArchive).toHaveBeenCalledWith('dry-001');
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('is isolated from grow room state (separate service calls)', async () => {
    mockList.mockResolvedValue([makeDryRoom()]);

    const { result } = renderHook(() => useDryRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rooms[0].room_code).toBe('DR-1');
  });
});
