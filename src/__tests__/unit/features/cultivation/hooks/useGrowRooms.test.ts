import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGrowRooms } from '@/features/cultivation/hooks/useGrowRooms';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makeGrowRoom } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    listGrowRooms: vi.fn(),
    createGrowRoom: vi.fn(),
    updateGrowRoom: vi.fn(),
    archiveGrowRoom: vi.fn(),
  },
}));

const mockList = cultivationService.listGrowRooms as ReturnType<typeof vi.fn>;
const mockCreate = cultivationService.createGrowRoom as ReturnType<typeof vi.fn>;
const mockUpdate = cultivationService.updateGrowRoom as ReturnType<typeof vi.fn>;
const mockArchive = cultivationService.archiveGrowRoom as ReturnType<typeof vi.fn>;

describe('useGrowRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading and fetches rooms on mount', async () => {
    const rooms = [makeGrowRoom()];
    mockList.mockResolvedValue(rooms);

    const { result } = renderHook(() => useGrowRooms());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rooms).toEqual(rooms);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('activeRooms filters out inactive rooms', async () => {
    mockList.mockResolvedValue([
      makeGrowRoom({ id: 'r1', is_active: true }),
      makeGrowRoom({ id: 'r2', is_active: false }),
    ]);

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeRooms).toHaveLength(1);
    expect(result.current.activeRooms[0].id).toBe('r1');
  });

  it('sets error message on load failure', async () => {
    mockList.mockRejectedValue(new Error('DB down'));

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load grow rooms');
    expect(result.current.rooms).toEqual([]);
  });

  it('clears error on subsequent successful load', async () => {
    mockList.mockRejectedValueOnce(new Error('First fail'));
    mockList.mockResolvedValueOnce([makeGrowRoom()]);

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.error).toBe('Failed to load grow rooms'));

    await act(async () => { await result.current.reload(); });
    expect(result.current.error).toBeNull();
  });

  it('createRoom calls service then reloads the list', async () => {
    const newRoom = makeGrowRoom({ id: 'r-new' });
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(newRoom);

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createRoom({ name: 'New Room', room_code: 'NR', room_type: 'veg' });
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('updateRoom calls service then reloads the list', async () => {
    const updatedRoom = makeGrowRoom({ name: 'Updated' });
    mockList.mockResolvedValue([makeGrowRoom()]);
    mockUpdate.mockResolvedValue(updatedRoom);

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateRoom('room-001', { name: 'Updated' });
    });

    expect(mockUpdate).toHaveBeenCalledWith('room-001', { name: 'Updated' });
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('archiveRoom calls service then reloads the list', async () => {
    mockList.mockResolvedValue([makeGrowRoom()]);
    mockArchive.mockResolvedValue(makeGrowRoom({ is_active: false }));

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.archiveRoom('room-001');
    });

    expect(mockArchive).toHaveBeenCalledWith('room-001');
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('reload re-fetches and updates rooms', async () => {
    mockList.mockResolvedValueOnce([]);
    mockList.mockResolvedValueOnce([makeGrowRoom()]);

    const { result } = renderHook(() => useGrowRooms());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rooms).toEqual([]);

    await act(async () => { await result.current.reload(); });
    expect(result.current.rooms).toHaveLength(1);
  });
});
