import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePlantGroups } from '@/features/cultivation/hooks/usePlantGroups';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makePlantGroup } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    listPlantGroups: vi.fn(),
    createPlantGroup: vi.fn(),
    advanceStage: vi.fn(),
    moveToRoom: vi.fn(),
    setMotherStatus: vi.fn(),
    getStageHistory: vi.fn(),
    getRoomHistory: vi.fn(),
  },
}));

const mockList = cultivationService.listPlantGroups as ReturnType<typeof vi.fn>;
const mockCreate = cultivationService.createPlantGroup as ReturnType<typeof vi.fn>;
const mockAdvance = cultivationService.advanceStage as ReturnType<typeof vi.fn>;
const mockMoveToRoom = cultivationService.moveToRoom as ReturnType<typeof vi.fn>;
const mockSetMother = cultivationService.setMotherStatus as ReturnType<typeof vi.fn>;
const mockStageHistory = cultivationService.getStageHistory as ReturnType<typeof vi.fn>;
const mockRoomHistory = cultivationService.getRoomHistory as ReturnType<typeof vi.fn>;

describe('usePlantGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads plant groups on mount', async () => {
    const groups = [makePlantGroup()];
    mockList.mockResolvedValue(groups);

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groups).toEqual(groups);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('passes filter to service', async () => {
    mockList.mockResolvedValue([makePlantGroup({ growth_stage: 'flower' })]);

    const { result } = renderHook(() => usePlantGroups({ stage: 'flower' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockList).toHaveBeenCalledWith({ stage: 'flower' });
  });

  it('reloads when filter stage changes', async () => {
    mockList.mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ stage }: { stage: 'veg' | 'flower' }) => usePlantGroups({ stage }),
      { initialProps: { stage: 'veg' as const } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockList).toHaveBeenCalledTimes(1);

    rerender({ stage: 'flower' });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith({ stage: 'flower' });
  });

  it('sets error message on load failure', async () => {
    mockList.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load plant groups');
  });

  it('createGroup calls service then reloads', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(makePlantGroup());

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createGroup({ strain_id: 'strain-001', grow_room_id: 'room-001', plant_count: 10 });
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('advanceStage calls service then reloads', async () => {
    mockList.mockResolvedValue([makePlantGroup()]);
    mockAdvance.mockResolvedValue(makePlantGroup({ growth_stage: 'flower' }));

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.advanceStage('pg-001', 'flower');
    });

    expect(mockAdvance).toHaveBeenCalledWith('pg-001', 'flower');
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('moveToRoom calls service then reloads', async () => {
    mockList.mockResolvedValue([makePlantGroup()]);
    mockMoveToRoom.mockResolvedValue(makePlantGroup({ grow_room_id: 'room-002' }));

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.moveToRoom('pg-001', 'room-002');
    });

    expect(mockMoveToRoom).toHaveBeenCalledWith('pg-001', 'room-002');
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('setMotherStatus calls service then reloads', async () => {
    mockList.mockResolvedValue([makePlantGroup()]);
    mockSetMother.mockResolvedValue(makePlantGroup({ is_mother: true }));

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMotherStatus('pg-001', true);
    });

    expect(mockSetMother).toHaveBeenCalledWith('pg-001', true);
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('getStageHistory does NOT reload the list', async () => {
    mockList.mockResolvedValue([makePlantGroup()]);
    mockStageHistory.mockResolvedValue([]);

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.getStageHistory('pg-001');
    });

    expect(mockStageHistory).toHaveBeenCalledWith('pg-001');
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('getRoomHistory does NOT reload the list', async () => {
    mockList.mockResolvedValue([makePlantGroup()]);
    mockRoomHistory.mockResolvedValue([]);

    const { result } = renderHook(() => usePlantGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.getRoomHistory('pg-001');
    });

    expect(mockRoomHistory).toHaveBeenCalledWith('pg-001');
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});
