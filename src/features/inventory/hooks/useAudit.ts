import { useState, useCallback } from 'react';
import {
  auditService,
  type AuditSession,
  type AuditSessionWithLines,
  type AuditLine,
  type AuditApplySummary,
  type StartAuditInput,
  type VarianceReason,
  type LineStatus,
} from '../services/audit.service';

export type AuditScreen = 'hub' | 'counting' | 'review';

interface UseAuditReturn {
  // Data
  sessions: AuditSession[];
  activeSession: AuditSessionWithLines | null;
  screen: AuditScreen;

  // Loading / error
  loading: boolean;
  actionLoading: boolean;
  error: string | null;

  // Navigation
  setScreen: (s: AuditScreen) => void;

  // Session list
  reloadSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  clearActiveSession: () => void;

  // Lifecycle
  startAudit: (input: StartAuditInput) => Promise<AuditSessionWithLines>;
  moveToReview: () => Promise<void>;
  applyAudit: () => Promise<AuditApplySummary>;
  abandonAudit: (reason?: string) => Promise<void>;

  // Line actions
  recordCount: (lineId: string, actualQty: number, opts?: { variance_reason?: VarianceReason; variance_notes?: string }) => Promise<void>;
  markNotFound: (lineId: string, opts?: { variance_notes?: string }) => Promise<void>;
  resetLine: (lineId: string) => Promise<void>;
  createOrphanLine: (item: Parameters<typeof auditService.createOrphanLine>[1]) => Promise<void>;
}

function applyLinePatch(session: AuditSessionWithLines, updated: AuditLine): AuditSessionWithLines {
  return {
    ...session,
    lines: session.lines.map((l) => (l.id === updated.id ? updated : l)),
  };
}

function addLine(session: AuditSessionWithLines, line: AuditLine): AuditSessionWithLines {
  return { ...session, lines: [...session.lines, line] };
}

/**
 * Manages both the session list (hub) and active session (counting/review)
 * in one hook, keeping the hub → counting → review → applied flow
 * stateful without a parent context.
 */
export function useAudit(): UseAuditReturn {
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [activeSession, setActiveSession] = useState<AuditSessionWithLines | null>(null);
  const [screen, setScreen] = useState<AuditScreen>('hub');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.listSessions({ status: 'all' });
      setSessions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load audit sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getSession(id);
      setActiveSession(data);
      // Auto-navigate based on status
      if (data.status === 'review') {
        setScreen('review');
      } else if (data.status === 'in_progress') {
        setScreen('counting');
      } else {
        setScreen('review'); // applied/abandoned — show summary
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load audit session');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearActiveSession = useCallback(() => {
    setActiveSession(null);
    setScreen('hub');
  }, []);

  const startAudit = useCallback(async (input: StartAuditInput) => {
    setActionLoading(true);
    setError(null);
    try {
      const data = await auditService.startAudit(input);
      setActiveSession(data);
      setScreen('counting');
      return data;
    } catch (e: any) {
      setError(e.message || 'Failed to start audit');
      throw e;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const recordCount = useCallback(async (
    lineId: string,
    actualQty: number,
    opts?: { variance_reason?: VarianceReason; variance_notes?: string },
  ) => {
    setActionLoading(true);
    try {
      const updated = await auditService.recordCount(lineId, actualQty, opts);
      setActiveSession((prev) => prev ? applyLinePatch(prev, updated) : prev);
    } catch (e: any) {
      setError(e.message || 'Failed to record count');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const markNotFound = useCallback(async (lineId: string, opts?: { variance_notes?: string }) => {
    setActionLoading(true);
    try {
      const updated = await auditService.markNotFound(lineId, opts);
      setActiveSession((prev) => prev ? applyLinePatch(prev, updated) : prev);
    } catch (e: any) {
      setError(e.message || 'Failed to mark not found');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const resetLine = useCallback(async (lineId: string) => {
    setActionLoading(true);
    try {
      const updated = await auditService.resetLine(lineId);
      setActiveSession((prev) => prev ? applyLinePatch(prev, updated) : prev);
    } catch (e: any) {
      setError(e.message || 'Failed to reset line');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const createOrphanLine = useCallback(async (item: Parameters<typeof auditService.createOrphanLine>[1]) => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const line = await auditService.createOrphanLine(activeSession.id, item);
      setActiveSession((prev) => prev ? addLine(prev, line) : prev);
    } catch (e: any) {
      setError(e.message || 'Failed to create orphan line');
    } finally {
      setActionLoading(false);
    }
  }, [activeSession]);

  const moveToReview = useCallback(async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await auditService.moveToReview(activeSession.id);
      setActiveSession((prev) => prev ? { ...prev, status: 'review' } : prev);
      setScreen('review');
    } catch (e: any) {
      setError(e.message || 'Failed to move to review');
    } finally {
      setActionLoading(false);
    }
  }, [activeSession]);

  const applyAudit = useCallback(async () => {
    if (!activeSession) throw new Error('No active session');
    setActionLoading(true);
    try {
      const summary = await auditService.applyAudit(activeSession.id);
      setActiveSession((prev) => prev ? { ...prev, status: 'applied', summary: summary as unknown as Record<string, unknown> } : prev);
      return summary;
    } catch (e: any) {
      setError(e.message || 'Failed to apply audit');
      throw e;
    } finally {
      setActionLoading(false);
    }
  }, [activeSession]);

  const abandonAudit = useCallback(async (reason?: string) => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await auditService.abandonAudit(activeSession.id, reason);
      setActiveSession((prev) => prev ? { ...prev, status: 'abandoned', abandoned_at: new Date().toISOString() } : prev);
    } catch (e: any) {
      setError(e.message || 'Failed to abandon audit');
    } finally {
      setActionLoading(false);
    }
  }, [activeSession]);

  return {
    sessions,
    activeSession,
    screen,
    loading,
    actionLoading,
    error,
    setScreen,
    reloadSessions,
    loadSession,
    clearActiveSession,
    startAudit,
    moveToReview,
    applyAudit,
    abandonAudit,
    recordCount,
    markNotFound,
    resetLine,
    createOrphanLine,
  };
}
