import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  completeTrimSession,
  cancelTrimSession,
  completeBuckingSession,
  cancelBuckingSession,
  completePackagingSession,
  cancelPackagingSession,
} from '@/features/sessions/services/sessions.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';

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

// =====================================================
// Shared mock factory for a typical Supabase update chain:
// .update().eq().select().single()
// =====================================================
function mockUpdateChain(resolvedValue: unknown) {
  const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq    = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq, mockSelect, mockSingle };
}

// =====================================================
// Shared mock factory for a cancel chain:
// .update().eq()  (no .select() — cancel returns void-like)
// =====================================================
function mockCancelChain(resolvedValue: unknown) {
  const mockEq     = vi.fn().mockResolvedValue(resolvedValue);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq };
}

describe('sessions.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // completeTrimSession
  // =====================================================

  describe('completeTrimSession', () => {
    const sessionId = 'trim-session-001';
    const completionData = {
      big_buds_grams: 800,
      small_buds_grams: 100,
      trim_grams: 50,
      waste_grams: 10,
      bucked_smalls_grams: 0,
    };

    it('updates trim_sessions table with the correct session_id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId, session_status: 'completed' })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeTrimSession(sessionId, completionData);

      expect(supabase.from).toHaveBeenCalledWith('trim_sessions');
      expect(mockEq).toHaveBeenCalledWith('id', sessionId);
    });

    it('sets completed_at timestamp on the update payload', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeTrimSession(sessionId, completionData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ completed_at: expect.any(String) })
      );
    });

    it('includes all completion output weights in the update payload', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeTrimSession(sessionId, completionData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          big_buds_grams: 800,
          small_buds_grams: 100,
          trim_grams: 50,
          waste_grams: 10,
        })
      );
    });

    it('returns data and null error on success', async () => {
      const mockSession = { id: sessionId, session_status: 'completed' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeTrimSession(sessionId, completionData);

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('returns null data and error when the database rejects the update', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseError('violates row-level security')
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeTrimSession(sessionId, completionData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // cancelTrimSession
  // =====================================================

  describe('cancelTrimSession', () => {
    const sessionId = 'trim-session-002';

    it('sets session_status=cancelled and cancelled_at on the update payload', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelTrimSession(sessionId, 'Operator error');

      expect(supabase.from).toHaveBeenCalledWith('trim_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          session_status: 'cancelled',
          cancelled_at: expect.any(String),
        })
      );
    });

    it('passes optional cancellation notes to the update payload', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelTrimSession(sessionId, 'Wrong batch pulled');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Wrong batch pulled' })
      );
    });

    it('returns null error on success', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelTrimSession(sessionId);

      expect(result.error).toBeNull();
    });

    it('returns error when the database rejects the cancellation', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseError('Permission denied'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelTrimSession(sessionId);

      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // completeBuckingSession
  // =====================================================

  describe('completeBuckingSession', () => {
    const sessionId = 'bucking-session-001';
    const completionData = {
      bucked_flower_grams: 5000,
      small_buds_grams: 500,
      waste_grams: 100,
    };

    it('updates bucking_sessions table with the correct session_id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeBuckingSession(sessionId, completionData);

      expect(supabase.from).toHaveBeenCalledWith('bucking_sessions');
      expect(mockEq).toHaveBeenCalledWith('id', sessionId);
    });

    it('sets completed_at timestamp on the update payload', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completeBuckingSession(sessionId, completionData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ completed_at: expect.any(String) })
      );
    });

    it('returns data and null error on success', async () => {
      const mockSession = { id: sessionId, session_status: 'completed' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeBuckingSession(sessionId, completionData);

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('returns null data and error on database failure', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('DB error'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completeBuckingSession(sessionId, completionData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // cancelBuckingSession
  // =====================================================

  describe('cancelBuckingSession', () => {
    const sessionId = 'bucking-session-002';

    it('updates bucking_sessions with session_status=cancelled', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelBuckingSession(sessionId);

      expect(supabase.from).toHaveBeenCalledWith('bucking_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ session_status: 'cancelled' })
      );
    });

    it('returns null error on success', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelBuckingSession(sessionId);

      expect(result.error).toBeNull();
    });
  });

  // =====================================================
  // completePackagingSession
  // =====================================================

  describe('completePackagingSession', () => {
    const sessionId = 'packaging-session-001';
    const completionData = {
      units_35g: 10,
      units_7g: 5,
      units_14g: 2,
      units_28g: 1,
      units_454g: 0,
    };

    it('updates packaging_sessions table with the correct session_id', async () => {
      const { mockUpdate, mockEq } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completePackagingSession(sessionId, completionData);

      expect(supabase.from).toHaveBeenCalledWith('packaging_sessions');
      expect(mockEq).toHaveBeenCalledWith('id', sessionId);
    });

    it('sets completed_at timestamp on the update payload', async () => {
      const { mockUpdate } = mockUpdateChain(
        mockSupabaseSuccess({ id: sessionId })
      );
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await completePackagingSession(sessionId, completionData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ completed_at: expect.any(String) })
      );
    });

    it('returns data and null error on success', async () => {
      const mockSession = { id: sessionId, session_status: 'completed' };
      const { mockUpdate } = mockUpdateChain(mockSupabaseSuccess(mockSession));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completePackagingSession(sessionId, completionData);

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('returns null data and error on database failure', async () => {
      const { mockUpdate } = mockUpdateChain(mockSupabaseError('DB error'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await completePackagingSession(sessionId, completionData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // cancelPackagingSession
  // =====================================================

  describe('cancelPackagingSession', () => {
    const sessionId = 'packaging-session-002';

    it('updates packaging_sessions with session_status=cancelled', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await cancelPackagingSession(sessionId, 'Equipment failure');

      expect(supabase.from).toHaveBeenCalledWith('packaging_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          session_status: 'cancelled',
          notes: 'Equipment failure',
        })
      );
    });

    it('returns null error on success', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseSuccess(null));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelPackagingSession(sessionId);

      expect(result.error).toBeNull();
    });

    it('returns error when the database rejects the cancellation', async () => {
      const { mockUpdate } = mockCancelChain(mockSupabaseError('Session already completed'));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await cancelPackagingSession(sessionId);

      expect(result.error).toBeTruthy();
    });
  });
});
