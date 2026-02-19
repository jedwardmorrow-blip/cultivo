import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { HarvestSession, HarvestSessionStatus, CreateHarvestSessionInput } from '../types';

export function useHarvestSessions(filter?: { status?: HarvestSessionStatus }) {
  const [sessions, setSessions] = useState<HarvestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listHarvestSessions(filter);
      setSessions(data);
    } catch {
      setError('Failed to load harvest sessions');
    } finally {
      setLoading(false);
    }
  }, [filter?.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSession(input: CreateHarvestSessionInput): Promise<HarvestSession> {
    const session = await cultivationService.createHarvestSession(input);
    await load();
    return session;
  }

  async function completeSession(id: string): Promise<HarvestSession> {
    const session = await cultivationService.completeHarvestSession(id);
    await load();
    return session;
  }

  async function cancelSession(id: string): Promise<HarvestSession> {
    const session = await cultivationService.cancelHarvestSession(id);
    await load();
    return session;
  }

  async function adjustWeight(id: string, adjustedWeight: number, reason: string): Promise<HarvestSession> {
    const session = await cultivationService.adjustHarvestWeight(id, adjustedWeight, reason);
    await load();
    return session;
  }

  return {
    sessions,
    loading,
    error,
    reload: load,
    createSession,
    completeSession,
    cancelSession,
    adjustWeight,
  };
}
