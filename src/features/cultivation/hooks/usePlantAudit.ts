import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type {
  PlantAuditSession,
  PlantAuditSessionWithCounts,
  PlantAuditCount,
  PlantAuditSummary,
  StartPlantAuditInput,
  RecordPlantAuditCountInput,
  CreateOrphanPlantGroupInput,
  PlantGroup,
  PlantAuditCauseOfDeath,
} from '../types';

/**
 * usePlantAudit — state + actions for the plant audit surface.
 *
 * Exposes two concerns at once:
 *   1. Sessions list (for the hub)
 *   2. A single active session with counts (for the walk screen + review)
 *
 * Holding both in one hook keeps the hub → counting → review → applied
 * flow stateful without needing a parent context.
 */
export function usePlantAudit(opts?: { initialStatus?: 'active' | 'all' }) {
  const [sessions, setSessions] = useState<PlantAuditSession[]>([]);
  const [activeSession, setActiveSession] = useState<PlantAuditSessionWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listPlantAuditSessions({
        status: opts?.initialStatus ?? 'active',
      });
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plant audits');
    } finally {
      setLoading(false);
    }
  }, [opts?.initialStatus]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadSession = useCallback(async (id: string): Promise<PlantAuditSessionWithCounts> => {
    const data = await cultivationService.getPlantAuditSession(id);
    setActiveSession(data);
    return data;
  }, []);

  async function startSession(input: StartPlantAuditInput): Promise<PlantAuditSessionWithCounts> {
    const created = await cultivationService.startPlantAuditSession(input);
    setActiveSession(created);
    await loadSessions();
    return created;
  }

  async function recordCount(
    countId: string,
    input: RecordPlantAuditCountInput,
  ): Promise<PlantAuditCount> {
    const updated = await cultivationService.recordPlantAuditCount(countId, input);
    applyCountPatch(updated);
    return updated;
  }

  async function markNotFound(
    countId: string,
    args: { cause_of_death: PlantAuditCauseOfDeath; notes?: string | null },
  ): Promise<PlantAuditCount> {
    const updated = await cultivationService.markPlantAuditCountNotFound(countId, args);
    applyCountPatch(updated);
    return updated;
  }

  async function markSkipped(countId: string, notes?: string): Promise<PlantAuditCount> {
    const updated = await cultivationService.markPlantAuditCountSkipped(countId, notes);
    applyCountPatch(updated);
    return updated;
  }

  async function resetCount(countId: string): Promise<PlantAuditCount> {
    const updated = await cultivationService.resetPlantAuditCount(countId);
    applyCountPatch(updated);
    return updated;
  }

  async function createOrphan(
    input: CreateOrphanPlantGroupInput,
  ): Promise<{ group: PlantGroup; count: PlantAuditCount }> {
    const result = await cultivationService.createOrphanPlantGroup(input);
    setActiveSession((prev) =>
      prev ? { ...prev, counts: [...prev.counts, result.count] } : prev,
    );
    return result;
  }

  async function moveToReview(sessionId: string): Promise<PlantAuditSession> {
    const updated = await cultivationService.movePlantAuditSessionToReview(sessionId);
    setActiveSession((prev) => (prev ? { ...prev, ...updated } : prev));
    await loadSessions();
    return updated;
  }

  async function apply(sessionId: string): Promise<PlantAuditSummary> {
    const summary = await cultivationService.applyPlantAudit(sessionId);
    // After apply, refresh the session to pick up applied_at / status change.
    await loadSession(sessionId);
    await loadSessions();
    return summary;
  }

  async function abandon(sessionId: string, reason?: string): Promise<PlantAuditSession> {
    const updated = await cultivationService.abandonPlantAuditSession(sessionId, reason);
    setActiveSession((prev) => (prev && prev.id === sessionId ? null : prev));
    await loadSessions();
    return updated;
  }

  function applyCountPatch(updated: PlantAuditCount) {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        counts: prev.counts.map((c) => (c.id === updated.id ? updated : c)),
      };
    });
  }

  function clearActiveSession() {
    setActiveSession(null);
  }

  return {
    sessions,
    activeSession,
    loading,
    error,
    reloadSessions: loadSessions,
    loadSession,
    clearActiveSession,
    startSession,
    recordCount,
    markNotFound,
    markSkipped,
    resetCount,
    createOrphan,
    moveToReview,
    apply,
    abandon,
  };
}
