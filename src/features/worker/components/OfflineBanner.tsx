import { WifiOff, CloudOff, Loader2 } from 'lucide-react';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';

/**
 * Floating offline indicator for the worker view.
 * Shows a persistent banner when offline, and a brief "syncing" state
 * when coming back online with queued mutations.
 */
export function OfflineBanner() {
  const { isOnline, pendingMutations } = useNetworkStatus();

  // Online with no pending — nothing to show
  if (isOnline && pendingMutations === 0) return null;

  // Online but syncing queued mutations
  if (isOnline && pendingMutations > 0) {
    return (
      <div className="bg-sky-950 border-b border-sky-800 px-3 py-2 flex items-center gap-2 text-sky-300 text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        <span>
          Syncing {pendingMutations} queued {pendingMutations === 1 ? 'update' : 'updates'}...
        </span>
      </div>
    );
  }

  // Offline
  return (
    <div className="bg-amber-950 border-b border-amber-800 px-3 py-2 flex items-center gap-2 text-amber-300 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">
        You're offline — tasks will sync when connection returns
      </span>
      {pendingMutations > 0 && (
        <span className="flex items-center gap-1 text-amber-400/80 flex-shrink-0">
          <CloudOff className="w-3 h-3" />
          {pendingMutations} queued
        </span>
      )}
    </div>
  );
}
