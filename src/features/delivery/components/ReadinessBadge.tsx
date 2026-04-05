import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const READY_STATUSES = new Set(['ready_for_delivery', 'completed']);
const IN_PROGRESS_STATUSES = new Set(['processing', 'accepted']);

export function ReadinessBadge({ status }: { status: string }) {
  if (READY_STATUSES.has(status)) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-green-900/30 text-green-400 border border-green-600 rounded-sm">
        <CheckCircle2 className="w-3 h-3" />
        Ready
      </span>
    );
  }
  if (IN_PROGRESS_STATUSES.has(status)) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-900/30 text-amber-400 border border-amber-600 rounded-sm">
        <Clock className="w-3 h-3" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-red-900/30 text-red-400 border border-red-600 rounded-sm">
      <AlertTriangle className="w-3 h-3" />
      Needs Work
    </span>
  );
}

export { READY_STATUSES, IN_PROGRESS_STATUSES };
