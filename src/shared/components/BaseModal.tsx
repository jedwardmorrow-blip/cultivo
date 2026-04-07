import { ReactNode, useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { ConfirmDiscardDialog } from './ConfirmDiscardDialog';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  preventBackdropClose?: boolean;
  closeOnEscape?: boolean;
  isDirty?: boolean;
}

// Re-export for backwards compatibility — ConfirmDiscardDialog lives in its own file now (CUL-345 DS-5).
export { ConfirmDiscardDialog } from './ConfirmDiscardDialog';

export function BaseModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = 'lg',
  preventBackdropClose = true,
  closeOnEscape = false,
  isDirty = false,
}: BaseModalProps) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        attemptClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, attemptClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  const handleBackdropClick = preventBackdropClose ? undefined : attemptClose;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleBackdropClick} />

        <div className={`relative w-full ${maxWidthClasses[maxWidth]} glass-modal rounded-2xl shadow-glass-lg animate-fade-in`}>
          <div className="flex items-center justify-between border-b border-white/[0.08] p-6">
            <div className="flex items-center gap-3">
              {icon && <div className="text-cult-white">{icon}</div>}
              <h2 className="text-h2 font-bold text-cult-white uppercase tracking-wider">{title}</h2>
            </div>
            <button
              onClick={attemptClose}
              className="p-2 -m-2 text-cult-lighter-gray hover:text-cult-white hover:bg-white/[0.08] active:scale-95 transition-all duration-200 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {showDiscardDialog && (
        <ConfirmDiscardDialog
          onKeepEditing={() => setShowDiscardDialog(false)}
          onDiscard={() => {
            setShowDiscardDialog(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
