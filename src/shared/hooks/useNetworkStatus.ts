import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  /** True when the browser reports navigator.onLine */
  isOnline: boolean;
  /** Number of queued offline mutations waiting to sync */
  pendingMutations: number;
  /** Queue a mutation for background sync when offline */
  queueMutation: (url: string, method: string, headers: Record<string, string>, body: string) => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingMutations, setPendingMutations] = useState(0);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Listen for sync completion messages from the SW
    function handleSWMessage(event: MessageEvent) {
      if (event.data?.type === 'SYNC_COMPLETE') {
        setPendingMutations(event.data.remaining ?? 0);
      }
      if (event.data?.type === 'QUEUE_COUNT') {
        setPendingMutations(event.data.count ?? 0);
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Ask the SW for the current queue count on mount
    navigator.serviceWorker?.ready.then((reg) => {
      reg.active?.postMessage({ type: 'GET_QUEUE_COUNT' });
    });

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  const queueMutation = useCallback(
    (url: string, method: string, headers: Record<string, string>, body: string) => {
      navigator.serviceWorker?.ready.then((reg) => {
        reg.active?.postMessage({
          type: 'QUEUE_MUTATION',
          url,
          method,
          headers,
          body,
        });
        setPendingMutations((prev) => prev + 1);
      });
    },
    []
  );

  return { isOnline, pendingMutations, queueMutation };
}
