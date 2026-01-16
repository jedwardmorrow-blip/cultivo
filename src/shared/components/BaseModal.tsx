import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

export function BaseModal({ isOpen, onClose, title, icon, children, maxWidth = 'lg' }: BaseModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/80" onClick={onClose} />

        <div className={`relative w-full ${maxWidthClasses[maxWidth]} bg-cult-near-black border border-cult-medium-gray`}>
          <div className="flex items-center justify-between border-b border-cult-medium-gray p-6">
            <div className="flex items-center gap-3">
              {icon && <div className="text-cult-white">{icon}</div>}
              <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wider">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-cult-lighter-gray hover:text-cult-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
