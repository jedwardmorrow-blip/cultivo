/**
 * Integration tests: Session Management
 *
 * Tests lifecycle operations that apply to all session types (trim, bucking, packaging):
 *
 * 1. pauseSession
 *    - Inserts a session_pauses record
 *    - Sets is_paused=true on the session table
 *
 * 2. resumeSession
 *    - Finds the open pause record (resumed_at IS NULL)
 *    - Closes it with resumed_at and calculated pause_duration_minutes
 *    - Increments total_pause_minutes on the session and clears is_paused
 *
 * 3. undoCompletedSession
 *    - Fetches session to check for finalization block
 *    - Throws if any output has already been finalized (conversion exists)
 *    - Resets session_status='active' and clears completed_at if no block
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pauseSession,
  resumeSession,
  undoCompletedSession,
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

// =====================================================
// SHARED FIXTURES
// =====================================================

const SESSION_ID = 'session-001';

function makeOpenPause(paused_at = '2026-03-31T08:00:00.000Z') {
  return {
    id: 'pause-001',
    session_id: SESSION_ID,
    session_type: 'trim',
    paused_at,
    resumed_at: null,
  };
}

// =====================================================
// TEST HELPERS
// =====================================================

type SessionType = 'trim' | 'bucking' | 'packaging';

/**
 * Builds a mock chain for pauseSession.
 * Requires two sequential supabase.from calls:
 *   1. session_pauses.insert
 *   2. {type}_sessions.update.eq
 */
function mockPauseChain(
  insertResult: unknown,
  updateResult: unknown
) {
  let callCount = 0;
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // session_pauses.insert
      return { insert: vi.fn().mockResolvedValue(insertResult) };
    }
    // {type}_sessions.update.eq
    return {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(updateResult),
      }),
    };
  });
}

/**
 * Builds mocks for resumeSession.
 * Requires four sequential calls:
 *   1. session_pauses.select.eq.eq.is.order.limit.single → open pause record
 *   2. session_pauses.update.eq → close pause record
 *   3. {type}_sessions.select.eq.single → get current total_pause_minutes
 *   4. {type}_sessions.update.eq → set is_paused=false and increment total
 */
function mockResumeChain(
  openPauseResult: unknown,
  closePauseResult: unknown,
  sessionResult: unknown,
  finalUpdateResult: unknown
) {
  let callCount = 0;
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1:
        // Find open pause
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue(openPauseResult),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      case 2:
        // Close pause record
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(closePauseResult),
          }),
        };
      case 3:
        // Get session total_pause_minutes
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(sessionResult),
            }),
          }),
        };
      case 4:
        // Update session is_paused + total_pause_minutes
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(finalUpdateResult),
          }),
        };
      default:
        return null;
    }
  });
}

/**
 * Builds mocks for undoCompletedSession.
 * Requires two sequential calls:
 *   1. {type}_sessions.select.eq.single → fetch session for finalization check
 *   2. {type}_sessions.update.eq.select.single → apply undo
 */
function mockUndoChain(fetchResult: unknown, updateResult: unknown) {
  let callCount = 0;
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(fetchResult),
          }),
        }),
      };
    }
    return {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(updateResult),
          }),
        }),
      }),
    };
  });
}

// =====================================================
// TESTS
// =====================================================

describe('Session Management — integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // pauseSession
  // =====================================================

  describe('pauseSession', () => {
    it.each<[string, SessionType]>([
      ['trim',     'trim'],
      ['bucking',  'bucking'],
      ['packaging', 'packaging'],
    ])('inserts session_pauses record for %s session', async (_label, sessionType) => {
      mockPauseChain(
        mockSupabaseSuccess(null),
        mockSupabaseSuccess(null)
      );

      await pauseSession(SESSION_ID, sessionType);

      expect(supabase.from).toHaveBeenCalledWith('session_pauses');
    });

    it.each<[string, SessionType]>([
      ['trim',     'trim'],
      ['bucking',  'bucking'],
      ['packaging', 'packaging'],
    ])('sets is_paused=true on %s_sessions table', async (_label, sessionType) => {
      mockPauseChain(
        mockSupabaseSuccess(null),
        mockSupabaseSuccess(null)
      );

      await pauseSession(SESSION_ID, sessionType);

      expect(supabase.from).toHaveBeenCalledWith(`${sessionType}_sessions`);
    });

    it('records paused_at timestamp in session_pauses', async () => {
      let capturedInsert: unknown = null;
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        insert: vi.fn().mockImplementation((data: unknown) => {
          capturedInsert = data;
          return Promise.resolve(mockSupabaseSuccess(null));
        }),
      }));
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) }),
      });

      await pauseSession(SESSION_ID, 'trim');

      expect((capturedInsert as Record<string, unknown>).paused_at).toBeDefined();
      expect(() => new Date((capturedInsert as Record<string, unknown>).paused_at as string)).not.toThrow();
    });

    it('returns null error on success', async () => {
      mockPauseChain(mockSupabaseSuccess(null), mockSupabaseSuccess(null));

      const result = await pauseSession(SESSION_ID, 'trim');

      expect(result.error).toBeNull();
    });

    it('returns error when session_pauses insert fails', async () => {
      mockPauseChain(mockSupabaseError('constraint violation'), mockSupabaseSuccess(null));

      const result = await pauseSession(SESSION_ID, 'trim');

      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // resumeSession
  // =====================================================

  describe('resumeSession', () => {
    const PAUSED_AT = '2026-03-31T08:00:00.000Z';
    const openPause = makeOpenPause(PAUSED_AT);

    it('looks up open pause record (resumed_at IS NULL)', async () => {
      mockResumeChain(
        mockSupabaseSuccess(openPause),
        mockSupabaseSuccess(null),
        mockSupabaseSuccess({ total_pause_minutes: 0 }),
        mockSupabaseSuccess(null)
      );

      await resumeSession(SESSION_ID, 'trim');

      expect(supabase.from).toHaveBeenCalledWith('session_pauses');
    });

    it('closes the pause record with resumed_at and calculated duration', async () => {
      let closedPayload: unknown = null;
      let closeCallCount = 0;

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        closeCallCount++;
        if (closeCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(openPause)),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (closeCallCount === 2) {
          return {
            update: vi.fn().mockImplementation((data: unknown) => {
              closedPayload = data;
              return { eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) };
            }),
          };
        }
        if (closeCallCount === 3) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ total_pause_minutes: 0 })),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) }),
        };
      });

      await resumeSession(SESSION_ID, 'trim');

      const payload = closedPayload as Record<string, unknown>;
      expect(payload.resumed_at).toBeDefined();
      expect(typeof payload.pause_duration_minutes).toBe('number');
      expect((payload.pause_duration_minutes as number)).toBeGreaterThanOrEqual(0);
    });

    it('sets is_paused=false and increments total_pause_minutes on session', async () => {
      let finalPayload: unknown = null;
      let callCount = 0;

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(openPause)),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          return {
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) }),
          };
        }
        if (callCount === 3) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ total_pause_minutes: 5 })),
              }),
            }),
          };
        }
        // callCount === 4: final update
        return {
          update: vi.fn().mockImplementation((data: unknown) => {
            finalPayload = data;
            return { eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) };
          }),
        };
      });

      await resumeSession(SESSION_ID, 'trim');

      const payload = finalPayload as Record<string, unknown>;
      expect(payload).toMatchObject({ is_paused: false });
      // total_pause_minutes should be >= 5 (existing) + duration of current pause
      expect((payload.total_pause_minutes as number)).toBeGreaterThanOrEqual(5);
    });

    it('returns null error on success', async () => {
      mockResumeChain(
        mockSupabaseSuccess(openPause),
        mockSupabaseSuccess(null),
        mockSupabaseSuccess({ total_pause_minutes: 0 }),
        mockSupabaseSuccess(null)
      );

      const result = await resumeSession(SESSION_ID, 'trim');

      expect(result.error).toBeNull();
    });

    it('returns error when no open pause record is found', async () => {
      mockResumeChain(
        mockSupabaseError('No open pause found'),
        mockSupabaseSuccess(null),
        mockSupabaseSuccess({ total_pause_minutes: 0 }),
        mockSupabaseSuccess(null)
      );

      const result = await resumeSession(SESSION_ID, 'trim');

      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================
  // undoCompletedSession — finalization block guard
  // =====================================================

  describe('undoCompletedSession', () => {
    const completedSession = {
      id: SESSION_ID,
      session_status: 'completed',
      completed_at: '2026-04-01T12:00:00.000Z',
      // No finalization flags set → undo is allowed
      finalization_status_bigs: null,
      finalization_status_smalls: null,
      finalization_status_trim: null,
    };

    it('resets session to active state when no output is finalized', async () => {
      const undoneSession = {
        ...completedSession,
        session_status: 'active',
        completed_at: null,
      };

      mockUndoChain(
        mockSupabaseSuccess(completedSession),
        mockSupabaseSuccess(undoneSession)
      );

      const result = await undoCompletedSession(SESSION_ID, 'trim');

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        session_status: 'active',
        completed_at: null,
      });
    });

    it('sets session_status=active and clears completed_at in the update payload', async () => {
      let updatePayload: unknown = null;

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(completedSession)),
          }),
        }),
      }));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: vi.fn().mockImplementation((data: unknown) => {
          updatePayload = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...completedSession, session_status: 'active', completed_at: null })),
              }),
            }),
          };
        }),
      });

      await undoCompletedSession(SESSION_ID, 'trim');

      expect(updatePayload).toMatchObject({
        session_status: 'active',
        completed_at: null,
      });
    });

    // =====================================================
    // FINALIZATION BLOCK — trim session guards
    // =====================================================

    describe('trim session finalization block', () => {
      it.each([
        ['Flower',  { finalization_status_bigs: 'finalized' }],
        ['Smalls',  { finalization_status_smalls: 'finalized' }],
        ['Trim',    { finalization_status_trim: 'finalized' }],
      ])('blocks undo when %s output is finalized', async (_label, flags) => {
        const blockedSession = { ...completedSession, ...flags };

        (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(blockedSession)),
            }),
          }),
        });

        const result = await undoCompletedSession(SESSION_ID, 'trim');

        expect(result.error).toBeTruthy();
        expect(result.data).toBeNull();
        // DB update must NOT be called
        const calls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.length;
        expect(calls).toBe(1); // only the fetch, no update
      });
    });

    // =====================================================
    // FINALIZATION BLOCK — bucking session guards
    // =====================================================

    describe('bucking session finalization block', () => {
      const buckingBase = {
        id: SESSION_ID,
        session_status: 'completed',
        completed_at: '2026-04-01T12:00:00.000Z',
        finalization_status_bucked: null,
        finalization_status_smalls: null,
        finalization_status: null,
      };

      it.each([
        ['Bucked Flower', { finalization_status_bucked: 'finalized' }],
        ['Smalls',        { finalization_status_smalls: 'finalized' }],
        ['Output',        { finalization_status: 'finalized' }],
      ])('blocks undo when %s output is finalized', async (_label, flags) => {
        const blockedSession = { ...buckingBase, ...flags };

        (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(blockedSession)),
            }),
          }),
        });

        const result = await undoCompletedSession(SESSION_ID, 'bucking');

        expect(result.error).toBeTruthy();
        expect(result.data).toBeNull();
      });
    });

    // =====================================================
    // FINALIZATION BLOCK — packaging session guards
    // =====================================================

    describe('packaging session finalization block', () => {
      const packagingBase = {
        id: SESSION_ID,
        session_status: 'completed',
        completed_at: '2026-04-01T12:00:00.000Z',
        finalization_status_3_5g: null,
        finalization_status_14g: null,
        finalization_status_1lb: null,
        finalization_status_packaged: null,
      };

      it.each([
        ['3.5g',      { finalization_status_3_5g: 'finalized' }],
        ['14g',       { finalization_status_14g: 'finalized' }],
        ['1lb',       { finalization_status_1lb: 'finalized' }],
        ['Packaged',  { finalization_status_packaged: 'finalized' }],
      ])('blocks undo when %s output is finalized', async (_label, flags) => {
        const blockedSession = { ...packagingBase, ...flags };

        (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(blockedSession)),
            }),
          }),
        });

        const result = await undoCompletedSession(SESSION_ID, 'packaging');

        expect(result.error).toBeTruthy();
        expect(result.data).toBeNull();
      });
    });

    it('returns error when initial session fetch fails', async () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('Session not found')),
          }),
        }),
      });

      const result = await undoCompletedSession(SESSION_ID, 'trim');

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });
});
