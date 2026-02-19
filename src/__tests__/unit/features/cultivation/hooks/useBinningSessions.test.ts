import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBinningSessions } from '@/features/cultivation/hooks/useBinningSessions';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makeBinningSession, makeHarvestSession } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    listBinningSessions: vi.fn(),
    listUnbinnedHarvestSessions: vi.fn(),
    createBinningSession: vi.fn(),
    completeBinningSession: vi.fn(),
    cancelBinningSession: vi.fn(),
  },
}));

const mockListBinning = cultivationService.listBinningSessions as ReturnType<typeof vi.fn>;
const mockListUnbinned = cultivationService.listUnbinnedHarvestSessions as ReturnType<typeof vi.fn>;
const mockCreate = cultivationService.createBinningSession as ReturnType<typeof vi.fn>;
const mockComplete = cultivationService.completeBinningSession as ReturnType<typeof vi.fn>;
const mockCancel = cultivationService.cancelBinningSession as ReturnType<typeof vi.fn>;

describe('useBinningSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls both listBinningSessions and listUnbinnedHarvestSessions on mount', async () => {
    mockListBinning.mockResolvedValue([]);
    mockListUnbinned.mockResolvedValue([]);

    const { result } = renderHook(() => useBinningSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListBinning).toHaveBeenCalledTimes(1);
    expect(mockListUnbinned).toHaveBeenCalledTimes(1);
  });

  it('loading is true until both Promise.all queries resolve', async () => {
    let resolveBinning!: (v: unknown) => void;
    let resolveUnbinned!: (v: unknown) => void;

    mockListBinning.mockReturnValue(new Promise((res) => { resolveBinning = res; }));
    mockListUnbinned.mockReturnValue(new Promise((res) => { resolveUnbinned = res; }));

    const { result } = renderHook(() => useBinningSessions());
    expect(result.current.loading).toBe(true);

    resolveBinning([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.loading).toBe(true);

    resolveUnbinned([]);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('populates sessions and unbinnedHarvests on successful load', async () => {
    const binned = [makeBinningSession()];
    const unbinned = [makeHarvestSession({ session_status: 'completed' })];
    mockListBinning.mockResolvedValue(binned);
    mockListUnbinned.mockResolvedValue(unbinned);

    const { result } = renderHook(() => useBinningSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sessions).toEqual(binned);
    expect(result.current.unbinnedHarvests).toEqual(unbinned);
  });

  it('passes status filter to listBinningSessions but NOT to listUnbinnedHarvestSessions', async () => {
    mockListBinning.mockResolvedValue([]);
    mockListUnbinned.mockResolvedValue([]);

    const { result } = renderHook(() => useBinningSessions({ status: 'completed' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListBinning).toHaveBeenCalledWith({ status: 'completed' });
    expect(mockListUnbinned).toHaveBeenCalledWith();
  });

  it('sets error and leaves arrays empty when one query fails', async () => {
    mockListBinning.mockRejectedValue(new Error('DB error'));
    mockListUnbinned.mockResolvedValue([makeHarvestSession()]);

    const { result } = renderHook(() => useBinningSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load binning sessions');
    expect(result.current.sessions).toEqual([]);
    expect(result.current.unbinnedHarvests).toEqual([]);
  });

  it('reloads when status filter changes', async () => {
    mockListBinning.mockResolvedValue([]);
    mockListUnbinned.mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ status }: { status: 'active' | 'completed' }) => useBinningSessions({ status }),
      { initialProps: { status: 'active' as const } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListBinning).toHaveBeenCalledTimes(1);

    rerender({ status: 'completed' });
    await waitFor(() => expect(mockListBinning).toHaveBeenCalledTimes(2));
    expect(mockListBinning).toHaveBeenLastCalledWith({ status: 'completed' });
  });

  it('createSession calls service then reloads both queries', async () => {
    mockListBinning.mockResolvedValue([]);
    mockListUnbinned.mockResolvedValue([]);
    mockCreate.mockResolvedValue(makeBinningSession());

    const { result } = renderHook(() => useBinningSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSession({
        harvest_session_id: 'hs-001',
        dry_room_id: 'dry-001',
        batch_registry_id: 'batch-001',
        dry_weight_grams: 3500,
        bin_date: '2026-02-19',
      });
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockListBinning).toHaveBeenCalledTimes(2);
    expect(mockListUnbinned).toHaveBeenCalledTimes(2);
  });

  it('completeSession calls service then reloads', async () => {
    mockListBinning.mockResolvedValue([makeBinningSession()]);
    mockListUnbinned.mockResolvedValue([]);
    mockComplete.mockResolvedValue(makeBinningSession({ session_status: 'completed' }));

    const { result } = renderHook(() => useBinningSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeSession('bs-001');
    });

    expect(mockComplete).toHaveBeenCalledWith('bs-001');
    expect(mockListBinning).toHaveBeenCalledTimes(2);
  });

  it('cancelSession propagates error', async () => {
    mockListBinning.mockResolvedValue([makeBinningSession({ session_status: 'completed' })]);
    mockListUnbinned.mockResolvedValue([]);
    mockCancel.mockRejectedValue(new Error('Cannot cancel binning session'));

    const { result } = renderHook(() => useBinningSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => { await result.current.cancelSession('bs-completed'); })
    ).rejects.toThrow('Cannot cancel binning session');
  });
});
