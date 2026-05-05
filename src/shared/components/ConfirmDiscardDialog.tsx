import { AlertTriangle } from 'lucide-react';

export interface ConfirmDiscardDialogProps {
  onDiscard: () => void;
  onKeepEditing: () => void;
  title?: string;
  message?: string;
  discardLabel?: string;
  keepLabel?: string;
}

/**
 * Shared confirmation dialog for unsaved-changes close protection.
 * Used by BaseModal and by the useUnsavedChanges hook for drawers.
 * Part of CUL-345 DS-5 (Design System — dirty-state protection).
 */
export function ConfirmDiscardDialog({
  onDiscard,
  onKeepEditing,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes that will be lost. Are you sure you want to close?',
  discardLabel = 'Discard & Close',
  keepLabel = 'Keep Editing',
}: ConfirmDiscardDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative bg-cult-surface border-2 border-cult-warning/60 rounded-lg max-w-sm w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-cult-warning flex-shrink-0" />
            <h3 className="text-lg font-bold text-cult-text-primary">{title}</h3>
          </div>
          <p className="text-cult-text-muted text-sm mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onKeepEditing}
              className="flex-1 px-4 py-2.5 border border-cult-border text-cult-text-primary rounded-lg hover:bg-cult-surface transition-colors font-medium text-sm"
              autoFocus
            >
              {keepLabel}
            </button>
            <button
              onClick={onDiscard}
              className="flex-1 px-4 py-2.5 bg-cult-danger text-white rounded-lg hover:bg-cult-danger/80 transition-colors font-bold text-sm"
            >
              {discardLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
