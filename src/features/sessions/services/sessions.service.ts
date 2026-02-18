import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type {
  TrimSessionInsert,
  TrimSessionUpdate,
  BuckingSessionInsert,
  BuckingSessionUpdate,
  PackagingSessionInsert,
  PackagingSessionUpdate,
} from '../types';

/**
 * Sessions Service
 *
 * Centralized service for all production session operations (trim, bucking, packaging).
 */

// Trim Sessions
/**
 * Fetches all trim sessions
 *
 * @returns Promise<{ data: TrimSession[] | null; error: any }>
 * @description Returns all trim sessions ordered by creation date (newest first)
 */
export async function getTrimSessions() {
  try {
    const { data, error } = await supabase
      .from('trim_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load trim sessions');
    return { data: null, error };
  }
}

/**
 * Fetches active trim sessions
 *
 * @returns Promise<{ data: TrimSession[] | null; error: any }>
 * @description Returns trim sessions that are not completed or cancelled
 */
export async function getActiveTrimSessions() {
  try {
    const { data, error } = await supabase
      .from('trim_sessions')
      .select('*')
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load active trim sessions');
    return { data: null, error };
  }
}

/**
 * Creates a new trim session
 *
 * @param sessionData - Trim session data
 * @returns Promise<{ data: TrimSession | null; error: any }>
 */
export async function createTrimSession(sessionData: TrimSessionInsert) {
  try {
    const { data, error } = await supabase
      .from('trim_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create trim session');
    return { data: null, error };
  }
}

/**
 * Completes a trim session
 *
 * @param sessionId - Trim session UUID
 * @param completionData - Completion data (weights, yields, etc.)
 * @returns Promise<{ data: TrimSession | null; error: any }>
 * @description Sets completed_at timestamp and updates session data
 */
export async function completeTrimSession(sessionId: string, completionData: TrimSessionUpdate) {
  try {
    const { data, error } = await supabase
      .from('trim_sessions')
      .update({
        ...completionData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete trim session');
    return { data: null, error };
  }
}

/**
 * Cancels a trim session
 *
 * @param sessionId - Trim session UUID
 * @param notes - Optional cancellation notes
 * @returns Promise<{ data: TrimSession | null; error: any }>
 */
export async function cancelTrimSession(sessionId: string, notes?: string) {
  try {
    const { error } = await supabase
      .from('trim_sessions')
      .update({
        session_status: 'cancelled',
        notes: notes,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to cancel trim session');
    return { error };
  }
}

// Bucking Sessions
/**
 * Fetches all bucking sessions
 *
 * @returns Promise<{ data: BuckingSession[] | null; error: any }>
 */
export async function getBuckingSessions() {
  try {
    const { data, error } = await supabase
      .from('bucking_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load bucking sessions');
    return { data: null, error };
  }
}

/**
 * Fetches active bucking sessions
 *
 * @returns Promise<{ data: BuckingSession[] | null; error: any }>
 */
export async function getActiveBuckingSessions() {
  try {
    const { data, error } = await supabase
      .from('bucking_sessions')
      .select('*')
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load active bucking sessions');
    return { data: null, error };
  }
}

/**
 * Creates a new bucking session
 *
 * @param sessionData - Bucking session data
 * @returns Promise<{ data: BuckingSession | null; error: any }>
 */
export async function createBuckingSession(sessionData: BuckingSessionInsert) {
  try {
    const { data, error } = await supabase
      .from('bucking_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create bucking session');
    return { data: null, error };
  }
}

/**
 * Completes a bucking session
 *
 * @param sessionId - Bucking session UUID
 * @param completionData - Completion data
 * @returns Promise<{ data: BuckingSession | null; error: any }>
 */
export async function completeBuckingSession(sessionId: string, completionData: BuckingSessionUpdate) {
  try {
    const { data, error } = await supabase
      .from('bucking_sessions')
      .update({
        ...completionData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete bucking session');
    return { data: null, error };
  }
}

/**
 * Cancels a bucking session
 *
 * @param sessionId - Bucking session UUID
 * @param notes - Optional cancellation notes
 * @returns Promise<{ error: any | null }>
 */
export async function cancelBuckingSession(sessionId: string, notes?: string) {
  try {
    const { error } = await supabase
      .from('bucking_sessions')
      .update({
        session_status: 'cancelled',
        notes: notes,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to cancel bucking session');
    return { error };
  }
}

// Packaging Sessions
/**
 * Fetches all packaging sessions
 *
 * @returns Promise<{ data: PackagingSession[] | null; error: any }>
 */
export async function getPackagingSessions() {
  try {
    const { data, error } = await supabase
      .from('packaging_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load packaging sessions');
    return { data: null, error };
  }
}

/**
 * Fetches active packaging sessions
 *
 * @returns Promise<{ data: PackagingSession[] | null; error: any }>
 */
export async function getActivePackagingSessions() {
  try {
    const { data, error } = await supabase
      .from('packaging_sessions')
      .select('*')
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load active packaging sessions');
    return { data: null, error };
  }
}

/**
 * Creates a new packaging session
 *
 * @param sessionData - Packaging session data
 * @returns Promise<{ data: PackagingSession | null; error: any }>
 */
export async function createPackagingSession(sessionData: PackagingSessionInsert) {
  try {
    const { data, error } = await supabase
      .from('packaging_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create packaging session');
    return { data: null, error };
  }
}

/**
 * Completes a packaging session
 *
 * @param sessionId - Packaging session UUID
 * @param completionData - Completion data
 * @returns Promise<{ data: PackagingSession | null; error: any }>
 */
export async function completePackagingSession(sessionId: string, completionData: PackagingSessionUpdate) {
  try {
    const { data, error } = await supabase
      .from('packaging_sessions')
      .update({
        ...completionData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete packaging session');
    return { data: null, error };
  }
}

/**
 * Cancels a packaging session
 *
 * @param sessionId - Packaging session UUID
 * @param notes - Optional cancellation notes
 * @returns Promise<{ error: any | null }>
 */
export async function cancelPackagingSession(sessionId: string, notes?: string) {
  try {
    const { error } = await supabase
      .from('packaging_sessions')
      .update({
        session_status: 'cancelled',
        notes: notes,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to cancel packaging session');
    return { error };
  }
}

// Universal Undo Function
/**
 * Undoes a completed session, restoring it to active state
 *
 * @param sessionId - Session UUID
 * @param sessionType - Type of session ('trim' | 'bucking' | 'packaging')
 * @returns Promise<{ data: any | null; error: any }>
 * @description Clears the completed_at timestamp, restoring the session to active state.
 * This allows operators to correct mistakes immediately after completing a session.
 */
export async function undoCompletedSession(
  sessionId: string,
  sessionType: 'trim' | 'bucking' | 'packaging'
) {
  try {
    const { data: existingPackages, error: pkgError } = await supabase
      .from('conversion_packages')
      .select('id')
      .contains('source_session_ids', [sessionId])
      .limit(1);

    if (pkgError) throw pkgError;

    if (existingPackages && existingPackages.length > 0) {
      throw new Error(
        'Cannot undo: this session has already been finalized into conversion packages. ' +
        'Void the conversion first before undoing the session.'
      );
    }

    const tableName = `${sessionType}_sessions`;

    const { data, error } = await supabase
      .from(tableName)
      .update({
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, `Failed to undo completed ${sessionType} session`);
    return { data: null, error };
  }
}
