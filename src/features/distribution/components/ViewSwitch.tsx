/**
 * ViewSwitch — chip-pill row that toggles the primary panel between
 * Map | Calendar | Unscheduled. Pure presentational atom; the parent
 * owns the active mode state and click handlers.
 *
 * Lives inside the calendar header in calendar mode; lives as a tile
 * in the secondary column when map mode is primary.
 */

export type PrimaryView = 'calendar' | 'map' | 'unscheduled';

interface ViewSwitchProps {
  active: PrimaryView;
  onChange: (next: PrimaryView) => void;
  /** Compact mode: smaller padding, used inline in headers. */
  compact?: boolean;
}

const OPTIONS: { id: PrimaryView; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'unscheduled', label: 'Unscheduled' },
];

export function ViewSwitch({ active, onChange, compact }: ViewSwitchProps) {
  return (
    <div className="inline-flex items-center" style={{ gap: 6 }}>
      {OPTIONS.map((opt) => {
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="font-mono uppercase tracking-wider transition-colors"
            style={{
              padding: compact ? '3px 8px' : '4px 10px',
              fontSize: 9,
              letterSpacing: '0.1em',
              border: `1px solid ${isActive ? 'var(--accent)' : 'var(--op-line)'}`,
              borderRadius: 'var(--r-xs)',
              color: isActive ? 'var(--accent)' : 'var(--op-ink-2)',
              background: 'var(--op-canvas)',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
