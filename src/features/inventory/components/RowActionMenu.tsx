import { memo, ReactNode, useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface RowAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  visible?: boolean;
  destructive?: boolean;
}

interface RowActionMenuProps {
  actions: RowAction[];
}

export const RowActionMenu = memo(function RowActionMenu({ actions }: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const visibleActions = actions.filter((a) => a.visible !== false);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (visibleActions.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-md hover:bg-cult-medium-gray/60 text-cult-lighter-gray hover:text-cult-white transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl py-1 animate-fade-in">
          {visibleActions.map((action, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onClick();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                action.destructive
                  ? 'text-cult-danger hover:bg-cult-danger-muted hover:text-cult-danger'
                  : 'text-cult-silver hover:bg-cult-dark-gray hover:text-cult-white'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
