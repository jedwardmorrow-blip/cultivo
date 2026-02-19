import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useHarvestSessions } from '@/features/cultivation/hooks/useHarvestSessions';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makeHarvestSession } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    listHarvestSessions: vi.fn(),
    createHarvestSession: vi.fn(),
    completeHarvestSession: vi.fn(),
    cancelHarvestSession: vi.fn(),
    adjustHarvestWeight: vi.fn(),
  },
}));

const mockList = cultivationService.listHarvestSessions as ReturnType<typeof vi.fn>;
const mockCreate = cultivationService.createHarvestSession as ReturnType<typeof vi.fn>;
const mockComplete = cultivationService.completeHarvestSession as ReturnType<typeof vi.fn>;
const mockCancel = cultivationService.cancelHarvestSession as ReturnType<typeof vi.fn>;
const mockAdjust = cultivationService.adjustHarvestWeight as ReturnType<typeof vi.fn>;

describe('useHarvestSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads harvest sessions on mount', async () => {
    const sessions = [makeHarvestSession()];
    mockList.mockResolvedValue(sessions);

    const { result } = renderHook(() => useHarvestSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sessions).toEqual(sessions);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('passes status filter to service', async () => {
    mockList.mockResolvedValue([]);

    const { result } = renderHook(() => useHarvestSessions({ status: 'completed' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockList).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('reloads when status filter changes', async () => {
    mockList.mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ status }: { status: 'active' | 'completed' }) => useHarvestSessions({ status }),
      { initialProps: { status: 'active' as const } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockList).toHaveBeenCalledTimes(1);

    rerender({ status: 'completed' });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith({ status: 'completed' });
  });

  it('sets error on load failure', async () => {
    mockList.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useHarvestSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load harvest sessions');
  });

  it('createSession calls service then reloads', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(makeHarvestSession());

    const { result } = renderHook(() => useHarvestSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSession({
        plant_group_id: 'pg-001',
        harvest_date: '2026-02-19',
        wet_weight_grams: 5000,
        plant_count_harvested: 24,
      });
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('completeSession calls service then reloads', async () => {
    mockList.mockResolvedValue([makeHarvestSession()]);
    mockComplete.mockResolvedValue(makeHarvestSession({ session_status: 'completed', batch_registry_id: 'batch-001' }));

    const { result } = renderHook(() => useHarvestSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let completed: ReturnType<typeof makeHarvestSession> | undefined;
    await act(async () => {
      completed = await result.current.completeSession('hs-001');
    });

    expect(mockComplete).toHaveBeenCalledWith('hs-001');
    expect(completed?.batch_registry_id).toBe('batch-001');
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('cancelSession propagates error', async () => {
    mockList.mockResolvedValue([makeHarvestSession()]);
    mockCancel.mockRejectedValue(new Error('Cannot cancel harvest session'));

    const { result } = renderHook(() => useHarvestSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => { await result.current.cancelSession('hs-001'); })
    ).rejects.toThrow('Cannot cancel harvest session');
  });

  it('adjustWeight calls service then reloads', async () => {
    mockList.mockResolvedValue([makeHarvestSession()]);
    mockAdjust.mockResolvedValue(makeHarvestSession({ adjusted_weight_grams: 4800 }));

    const { result } = renderHook(() => useHarvestSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.adjustWeight('hs-001', 4800, 'Moisture correction');
    });

    expect(mockAdjust).toHaveBeenCalledWith('hs-001', 4800, 'Moisture correction');
    expect(mockList).toHaveBeenCalledTimes(2);
  });
});
