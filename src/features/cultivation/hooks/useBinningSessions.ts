import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { BinningSession, BinningSessionStatus, CreateBinningSessionInput, HarvestSession } from '../types';

export function useBinningSessions(filter?: { status?: BinningSessionStatus }) {
  const [sessions, setSessions] = useState<BinningSession[]>([]);
  const [unbinnedHarvests, setUnbinnedHarvests] = useState<HarvestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [sessionData, unbinnedData] = await Promise.all([
        cultivationService.listBinningSessions(filter),
        cultivationService.listUnbinnedHarvestSessions(),
      ]);
      setSessions(sessionData);
      setUnbinnedHarvests(unbinnedData);
    } catch {
      setError('Failed to load binning sessions');
    } finally {
      setLoading(false);
    }
  }, [filter?.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSession(input: CreateBinningSessionInput): Promise<BinningSession> {
    const session = await cultivationService.createBinningSession(input);
    await load();
    return session;
  }

  async function completeSession(id: string): Promise<BinningSession> {
    const session = await cultivationService.completeBinningSession(id);
    await load();
    return session;
  }

  async function cancelSession(id: string): Promise<BinningSession> {
    const session = await cultivationService.cancelBinningSession(id);
    await load();
    return session;
  }

  return {
    sessions,
    unbinnedHarvests,
    loading,
    error,
    reload: load,
    createSession,
    completeSession,
    cancelSession,
  };
}
