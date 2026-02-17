import { useState, useEffect, useCallback } from 'react';
import { getSessionContributions, SessionContribution } from '../services/conversions.service';

interface UseSessionContributionsResult {
  contributions: SessionContribution[];
  isLoading: boolean;
  error: string | null;
}

export function useSessionContributions(
  sessionIds: string[],
  sessionType: 'trim' | 'packaging' | 'bucking',
  enabled: boolean
): UseSessionContributionsResult {
  const [contributions, setContributions] = useState<SessionContribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = sessionIds.join(',');

  const fetch = useCallback(async () => {
    if (!enabled || sessionIds.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessionContributions(sessionIds, sessionType);
      setContributions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session details');
    } finally {
      setIsLoading(false);
    }
  }, [key, sessionType, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (enabled) {
      fetch();
    } else {
      setContributions([]);
      setError(null);
    }
  }, [fetch, enabled]);

  return { contributions, isLoading, error };
}
