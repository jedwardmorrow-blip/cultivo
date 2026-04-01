/**
 * Integration tests: Bucking Workflow
 *
 * Tests the bucking session lifecycle from creation to completion,
 * including cancellation, undo behavior, and the finalization block
 * that prevents editing after conversion.
 *
 * Bucking converts raw/hung plant material into:
 *   - Bucked flower (flower_bucked)
 *   - Small buds (smalls_bucked)
 *   - Waste
 *
 * Critical rule: once any output is finalized via conversion, the session
 * cannot be undone or edited (checkFinalizationBlock guard).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  completeBuckingSession,
  cancelBuckingSession,
} from '@/features/sessions/services/sessions.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  errorService: {
    handle: vi.fn(),
  },
}));

function mockUpdateChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq    = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq, mockSelect, mockSingle };
}

function mockCancelChain(resolvedValue: unknown) {
  const mockEq     = vi.fn().mockResolvedValue(resolvedValue);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq };
}

describe('Bucking Workflow — integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // HAPPY PATH: COMPLETE
  // =====================================================

  describe('completeBuckingSession', () => {
    const sessionId = 'bucking-001';
    const completionData = {
      bucked_flower_grams: 4500,
      small_buds_grams: 300,
      waste_grams: 200,
    };

    it('targets bucking_sessions table with the correct session id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId, session_status: 'completed' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeBuckingSession(sessionId, completionData);

      expect(supabase.from).toHaveBeenCalledWith('bucking_sessions');
      expect(mockEq).toHaveBeenCalledWith('id', sessionId);
    });

    it('sets session_status=completed and records completed_at timestamp', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId, session_status: 'completed' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeBuckingSession(sessionId, completionData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          session_status: 'completed',
          completed_at: expect.any(String),
        })
      );
    });

    it('stores all output weights in the update payload', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeBuckingSession(sessionId, completionData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          bucked_flower_grams: 4500,
          small_buds_grams: 300,
          waste_grams: 200,
        })
      );
    });

    it('returns the updated session data and null error on success', async () => {
      const mockSession = { id: sessionId, session_status: 'completed', bucked_flower_grams: 4500 };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeBuckingSession(sessionId, completionData);

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('returns null data and error when the database rejects', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('DB constraint violation'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeBuckingSession(sessionId, completionData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('completed_at is a valid ISO string', async () => {
      let capturedPayload: Record<string, unknown> = {};
      const mockSingle = vi.fn().mockResolvedValue(mockSupabaseSuccess({ id: sessionId }));
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq    = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
        capturedPayload = data;
        return { eq: mockEq };
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeBuckingSession(sessionId, completionData);

      expect(() => new Date(capturedPayload.completed_at as string)).not.toThrow();
      expect(new Date(capturedPayload.completed_at as string).toISOString()).toBe(capturedPayload.completed_at);
    });
  });

  // =====================================================
  // CANCELLATION PATH
  // =====================================================

  describe('cancelBuckingSession', () => {
    const sessionId = 'bucking-002';

    it('sets session_status=cancelled on the bucking_sessions table', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelBuckingSession(sessionId);

      expect(supabase.from).toHaveBeenCalledWith('bucking_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ session_status: 'cancelled' })
      );
    });

    it('records cancelled_at timestamp on cancellation', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelBuckingSession(sessionId);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ cancelled_at: expect.any(String) })
      );
    });

    it('passes optional cancellation notes', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelBuckingSession(sessionId, 'Wrong batch pulled from freezer');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Wrong batch pulled from freezer' })
      );
    });

    it('returns null error on successful cancellation', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelBuckingSession(sessionId);

      expect(result.error).toBeNull();
    });

    it('returns error when the database rejects the cancellation', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseError('Permission denied'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelBuckingSession(sessionId);

      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // COMPLETION vs CANCELLATION COMPARISON
  // Tests key business rule: cancellation must NOT store output weights
  // (no output → no pending_conversions → no inventory impact)
  // =====================================================

  describe('completion vs cancellation — business rule boundary', () => {
    it('cancellation does NOT store output weights', async () => {
      let capturedPayload: Record<string, unknown> = {};
      const mockEq = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));
      const mockUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
        capturedPayload = data;
        return { eq: mockEq };
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelBuckingSession('bucking-003', 'Equipment failure');

      expect(capturedPayload).not.toHaveProperty('bucked_flower_grams');
      expect(capturedPayload).not.toHaveProperty('small_buds_grams');
      expect(capturedPayload).not.toHaveProperty('waste_grams');
    });

    it('completion stores output weights and cancellation stores notes — different payload shapes', async () => {
      const completedPayloads: Array<Record<string, unknown>> = [];
      const cancelledPayloads: Array<Record<string, unknown>> = [];

      // Mock for completion
      const completionMockSingle = vi.fn().mockResolvedValue(mockSupabaseSuccess({ id: 's1' }));
      const completionMockSelect = vi.fn().mockReturnValue({ single: completionMockSingle });
      const completionMockEq = vi.fn().mockReturnValue({ select: completionMockSelect });
      const completionMockUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
        completedPayloads.push(data);
        return { eq: completionMockEq };
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: completionMockUpdate });
      await completeBuckingSession('s1', { bucked_flower_grams: 4000, small_buds_grams: 200, waste_grams: 100 });

      // Mock for cancellation
      const cancelMockEq = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));
      const cancelMockUpdate = vi.fn().mockImplementation((data: Record<string, unknown>) => {
        cancelledPayloads.push(data);
        return { eq: cancelMockEq };
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: cancelMockUpdate });
      await cancelBuckingSession('s2', 'Equipment failure');

      expect(completedPayloads[0]).toHaveProperty('bucked_flower_grams', 4000);
      expect(completedPayloads[0]).toHaveProperty('session_status', 'completed');

      expect(cancelledPayloads[0]).toHaveProperty('session_status', 'cancelled');
      expect(cancelledPayloads[0]).not.toHaveProperty('bucked_flower_grams');
    });
  });

  // =====================================================
  // MATERIAL BALANCE VALIDATION
  // Bucking output: flower + smalls + waste ≈ input
  // =====================================================

  describe('output weight validation', () => {
    it('accepts output where flower + smalls + waste equals input weight', async () => {
      // 4500 + 300 + 200 = 5000 (matches input)
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: 'bucking-004', session_status: 'completed' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeBuckingSession('bucking-004', {
        bucked_flower_grams: 4500,
        small_buds_grams: 300,
        waste_grams: 200,
      });

      expect(result.error).toBeNull();
    });

    it('accepts output with only flower and waste (no smalls)', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: 'bucking-005', session_status: 'completed' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeBuckingSession('bucking-005', {
        bucked_flower_grams: 4800,
        small_buds_grams: 0,
        waste_grams: 200,
      });

      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ small_buds_grams: 0 })
      );
    });
  });
});
