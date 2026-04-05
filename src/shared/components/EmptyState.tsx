import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Lucide icon component. Renders at 40x40 with muted color. */
  icon?: LucideIcon;
  /** Primary headline — short, descriptive. */
  title: string;
  /** Optional supporting copy explaining what should go here or why it's empty. */
  message?: string;
  /** Optional call-to-action button. Pass both label + onClick, or a fully custom ReactNode via `cta`. */
  actionLabel?: string;
  onAction?: () => void;
  /** Escape hatch for a fully custom CTA (e.g. a link, a modal trigger). */
  cta?: ReactNode;
  /** Compact variant reduces padding — useful inside table rows and small panels. */
  compact?: boolean;
  /** Additional className applied to the outer container. */
  className?: string;
}

/**
 * CUL-345 / DS-4: Standard empty state component.
 *
 * Design rule per CUL-332 spec: icon + message + optional CTA.
 * Replace all ad-hoc "No X found" text blocks with this component.
 *
 * Examples:
 * ```tsx
 * <EmptyState icon={Inbox} title="No orders yet" />
 *
 * <EmptyState
 *   icon={Leaf}
 *   title="No active rooms"
 *   message="Start by creating a grow room in Room Setup."
 *   actionLabel="Create Room"
 *   onAction={() => openRoomSetup()}
 * />
 *
 * <EmptyState compact title="No tasks scheduled today" />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  cta,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const paddingClass = compact ? 'py-6 px-4' : 'py-12 px-6';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${paddingClass} ${className}`}
      role="status"
    >
      {Icon && (
        <div className="mb-3 text-cult-text-muted">
          <Icon className={compact ? 'w-6 h-6' : 'w-10 h-10'} strokeWidth={1.5} />
        </div>
      )}
      <h3
        className={`font-semibold text-cult-white ${compact ? 'text-[13px]' : 'text-[14px]'}`}
      >
        {title}
      </h3>
      {message && (
        <p
          className={`text-cult-text-muted mt-1.5 max-w-md ${compact ? 'text-[11px]' : 'text-[12px]'}`}
        >
          {message}
        </p>
      )}
      {cta ? (
        <div className="mt-4">{cta}</div>
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-[12px] font-semibold bg-cult-accent text-cult-black rounded hover:bg-cult-accent/90 transition-colors min-h-[36px]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
