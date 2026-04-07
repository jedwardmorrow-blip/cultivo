import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const confirmColors = variant === 'danger'
    ? 'bg-cult-danger hover:bg-cult-danger/80 text-white'
    : variant === 'warning'
      ? 'bg-cult-warning hover:bg-cult-warning/80 text-white'
      : 'bg-cult-green hover:bg-cult-green-bright text-cult-black';

  const iconColors = variant === 'danger'
    ? 'text-cult-danger bg-cult-danger/15'
    : variant === 'warning'
      ? 'text-cult-warning bg-cult-warning/15'
      : 'text-cult-green bg-cult-green/10';

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-cult-near-black border border-cult-charcoal rounded-cult max-w-md w-full shadow-2xl animate-fade-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full flex-shrink-0 ${iconColors}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-cult-off-white mb-2">{title}</h3>
              <p className="text-sm text-cult-silver leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-cult-charcoal flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-cult-silver hover:text-cult-white bg-cult-charcoal hover:bg-cult-medium-gray rounded transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded transition-all ${confirmColors}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
