import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlantGroupPlacement } from '@/features/cultivation/hooks/usePlantGroupPlacement';
import { cultivationService } from '@/features/cultivation/services/cultivation.service';
import { makePlantGroup } from '../../../../fixtures/cultivationFixtures';

vi.mock('@/features/cultivation/services/cultivation.service', () => ({
  cultivationService: {
    updatePlantGroupPlacement: vi.fn(),
  },
}));

const mockUpdate = cultivationService.updatePlantGroupPlacement as ReturnType<typeof vi.fn>;

describe('usePlantGroupPlacement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with saving: false and error: null', () => {
    const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does NOT call service on mount (action-only hook)', () => {
    renderHook(() => usePlantGroupPlacement('pg-001'));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  describe('updatePlacement', () => {
    it('calls updatePlantGroupPlacement with groupId and input', async () => {
      mockUpdate.mockResolvedValue(makePlantGroup({ room_table_id: 'table-001', room_section_id: 'section-001' }));

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: 'table-001', room_section_id: 'section-001' });
      });

      expect(mockUpdate).toHaveBeenCalledWith('pg-001', {
        room_table_id: 'table-001',
        room_section_id: 'section-001',
      });
    });

    it('returns true on success', async () => {
      mockUpdate.mockResolvedValue(makePlantGroup());

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.updatePlacement({ room_table_id: 'table-001', room_section_id: null });
      });

      expect(returned).toBe(true);
    });

    it('saving resets to false after the operation completes', async () => {
      mockUpdate.mockResolvedValue(makePlantGroup());

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: null, room_section_id: null });
      });

      expect(result.current.saving).toBe(false);
    });

    it('calls onSuccess callback after a successful update', async () => {
      mockUpdate.mockResolvedValue(makePlantGroup());
      const onSuccess = vi.fn();

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001', onSuccess));

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: 'table-001', room_section_id: null });
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onSuccess when the update fails', async () => {
      mockUpdate.mockRejectedValue(new Error('RLS violation'));
      const onSuccess = vi.fn();

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001', onSuccess));

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: 'table-001', room_section_id: null });
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('returns false and sets error on failure', async () => {
      mockUpdate.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.updatePlacement({ room_table_id: null, room_section_id: null });
      });

      expect(returned).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('uses fallback error message for non-Error rejections', async () => {
      mockUpdate.mockRejectedValue('plain string error');

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: null, room_section_id: null });
      });

      expect(result.current.error).toBe('Failed to update placement');
    });

    it('clears error on subsequent successful update', async () => {
      mockUpdate.mockRejectedValueOnce(new Error('First failure'));
      mockUpdate.mockResolvedValueOnce(makePlantGroup());

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: null, room_section_id: null });
      });
      expect(result.current.error).toBe('First failure');

      await act(async () => {
        await result.current.updatePlacement({ room_table_id: 'table-001', room_section_id: null });
      });
      expect(result.current.error).toBeNull();
    });

    it('works without onSuccess callback (backward compatible)', async () => {
      mockUpdate.mockResolvedValue(makePlantGroup());

      const { result } = renderHook(() => usePlantGroupPlacement('pg-001'));

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.updatePlacement({ room_table_id: null, room_section_id: null });
      });

      expect(returned).toBe(true);
    });
  });
});
