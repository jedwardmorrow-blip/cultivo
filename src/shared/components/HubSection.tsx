import type { ReactNode, ElementType } from 'react';

/**
 * Shared HubSection — canonical lifted section header + body.
 *
 * Pulls the dashboard's home-section-header pattern into a portable wrapper
 * any hub view can use. Renders a hairline-bottomed header strip (icon +
 * 11px Plex Mono 0.14em label + optional meta on the right) above the
 * children content area.
 *
 * Drop-in replacement for the older `<div className="bg-cult-surface
 * border border-cult-surface rounded-cult p-4"><h2 className="text-label
 * ...">{title}</h2>...</div>` pattern inside HubShell consumers.
 */
export interface HubSectionProps {
  label: string;
  icon?: ElementType;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function HubSection({
  label,
  icon: Icon,
  meta,
  children,
  className = '',
  bodyClassName = 'px-4 py-4',
}: HubSectionProps) {
  return (
    <section
      className={`border border-cult-border rounded overflow-hidden bg-cult-surface ${className}`}
    >
      <header className="cult-section-header">
        {Icon && (
          <span className="cult-section-icon" aria-hidden="true">
            <Icon />
          </span>
        )}
        <span className="cult-section-label">{label}</span>
        {meta && <span className="cult-section-meta">{meta}</span>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
