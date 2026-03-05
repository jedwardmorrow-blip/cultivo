import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { BinningSession, BinningSessionStatus, BinEntry, CreateBinningSessionInput, CreateBinEntryInput, HarvestSession } from '../types';

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

  async function listBinEntries(sessionId: string): Promise<BinEntry[]> {
    return cultivationService.listBinEntries(sessionId);
  }

  async function addBinEntry(input: CreateBinEntryInput): Promise<BinEntry> {
    return cultivationService.createBinEntry(input);
  }

  async function removeBinEntry(id: string): Promise<void> {
    return cultivationService.deleteBinEntry(id);
  }

  async function addBinToCompleted(sessionId: string, binWeightGrams: number, notes?: string): Promise<BinEntry> {
    const entry = await cultivationService.addBinToCompletedSession(sessionId, binWeightGrams, notes);
    await load();
    return entry;
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
    listBinEntries,
    addBinEntry,
    removeBinEntry,
    addBinToCompleted,
  };
}
