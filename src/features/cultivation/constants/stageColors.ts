/**
 * Consolidated stage color tokens for the cultivation module.
 * Single source of truth — do not redefine these maps in individual components.
 *
 * Uses cult-stage-* Tailwind tokens from tailwind.config.js:
 *   clone → cult-stage-clone (#0EA5E9)
 *   veg   → cult-stage-veg   (#10B981)
 *   flower→ cult-stage-flower (#F43F5E)
 *   harvest→ cult-stage-harvest (#F59E0B)
 */

/** Badge classes for growth stage labels (text + border + bg) */
export const STAGE_BADGE: Record<string, string> = {
  clone: 'text-cult-stage-clone border-cult-stage-clone/30 bg-cult-stage-clone/10',
  veg: 'text-cult-stage-veg border-cult-stage-veg/30 bg-cult-stage-veg/10',
  flower: 'text-cult-stage-flower border-cult-stage-flower/30 bg-cult-stage-flower/10',
  harvested: 'text-cult-text-muted border-cult-border bg-cult-surface-raised',
};

/** Chip colors for batch summary chips by room type */
export const CHIP_STAGE_COLORS: Record<string, string> = {
  clone: 'border-cult-stage-clone/40 bg-cult-stage-clone/10 text-cult-stage-clone',
  veg: 'border-cult-stage-veg/40 bg-cult-stage-veg/10 text-cult-stage-veg',
  flower: 'border-cult-stage-flower/40 bg-cult-stage-flower/10 text-cult-stage-flower',
  mother: 'border-cult-stage-harvest/40 bg-cult-stage-harvest/10 text-cult-stage-harvest',
  mixed: 'border-cult-border-strong bg-cult-surface text-cult-text-secondary',
};

/** Room card border + subtle bg tint by room type */
export const ROOM_TYPE_COLORS: Record<string, string> = {
  clone: 'border-cult-stage-clone/50 bg-cult-stage-clone/5',
  veg: 'border-cult-stage-veg/50 bg-cult-stage-veg/5',
  flower: 'border-cult-stage-flower/50 bg-cult-stage-flower/5',
  mother: 'border-cult-stage-harvest/50 bg-cult-stage-harvest/5',
  mixed: 'border-cult-border-strong bg-cult-surface',
};

/** Room type border accent for drawer / detail views */
export const ROOM_TYPE_BORDER: Record<string, string> = {
  clone: 'border-cult-stage-clone/50',
  veg: 'border-cult-stage-veg/50',
  flower: 'border-cult-stage-flower/50',
  mother: 'border-cult-stage-harvest/50',
  mixed: 'border-cult-border-strong',
};

/** Subtle inner glow for room cards (inline boxShadow) */
export const INNER_GLOW: Record<string, string> = {
  clone: 'inset 0 0 30px rgba(14,165,233,0.06)',
  veg: 'inset 0 0 30px rgba(16,185,129,0.06)',
  flower: 'inset 0 0 30px rgba(244,63,94,0.06)',
  mother: 'inset 0 0 30px rgba(245,158,11,0.06)',
};

/** Left-border accent for list rows (task board, digest, dashboard) */
export const ROOM_TYPE_LEFT_BORDER: Record<string, string> = {
  clone: 'border-l-cult-stage-clone',
  veg: 'border-l-cult-stage-veg',
  flower: 'border-l-cult-stage-flower',
  mother: 'border-l-cult-stage-harvest',
  mixed: 'border-l-cult-border',
};

/** Solid bg color for room-type dot indicators */
export const ROOM_TYPE_DOT: Record<string, string> = {
  clone: 'bg-cult-stage-clone',
  veg: 'bg-cult-stage-veg',
  flower: 'bg-cult-stage-flower',
  mother: 'bg-cult-stage-harvest',
  mixed: 'bg-cult-border',
};

/** Text + border accent for room-type labels (no background) */
export const ROOM_TYPE_TEXT: Record<string, string> = {
  clone: 'text-cult-stage-clone border-cult-stage-clone',
  veg: 'text-cult-stage-veg border-cult-stage-veg',
  flower: 'text-cult-stage-flower border-cult-stage-flower',
  mother: 'text-cult-stage-harvest border-cult-stage-harvest',
  mixed: 'text-cult-text-secondary border-cult-border',
};

/** Full badge classes for settings / management views (text + border + bg) */
export const ROOM_TYPE_BADGE: Record<string, string> = {
  clone: 'bg-cult-stage-clone/10 border-cult-stage-clone/50 text-cult-stage-clone',
  veg: 'bg-cult-stage-veg/10 border-cult-stage-veg/50 text-cult-stage-veg',
  flower: 'bg-cult-stage-flower/10 border-cult-stage-flower/50 text-cult-stage-flower',
  mother: 'bg-cult-stage-harvest/10 border-cult-stage-harvest/50 text-cult-stage-harvest',
  mixed: 'bg-cult-surface border-cult-border-strong text-cult-text-secondary',
};

// ─── Semantic Status Tokens ───────────────────────────────────────────
// Replaces raw Tailwind colors (red-950, green-400, etc.) with cult-* equivalents.
// Use these across cultivation components for error, warning, success, and info states.

/** Error/danger banner: bg + border + text */
export const STATUS_ERROR_BANNER = 'bg-cult-danger/10 border border-cult-danger/40 text-cult-danger';

/** Error/danger inline text */
export const STATUS_ERROR_TEXT = 'text-cult-danger';

/** Error/danger button: destructive action */
export const STATUS_ERROR_BTN = 'bg-cult-danger/10 border border-cult-danger/40 text-cult-danger hover:bg-cult-danger/20 transition-colors';

/** Warning banner: bg + border + text */
export const STATUS_WARN_BANNER = 'bg-cult-warning/10 border border-cult-warning/40 text-cult-warning';

/** Warning inline text */
export const STATUS_WARN_TEXT = 'text-cult-warning';

/** Success/active inline text */
export const STATUS_SUCCESS_TEXT = 'text-cult-success';

/** Success badge: bg + border + text */
export const STATUS_SUCCESS_BADGE = 'bg-cult-success/10 border border-cult-success/40 text-cult-success';

/** Success button */
export const STATUS_SUCCESS_BTN = 'bg-cult-success/10 border border-cult-success/40 text-cult-success hover:bg-cult-success/20 transition-colors';

/** Info/completed badge: uses clone-blue */
export const STATUS_INFO_BADGE = 'bg-cult-stage-clone/10 border border-cult-stage-clone/40 text-cult-stage-clone';

/** Status badge map for session states */
export const SESSION_STATUS_BADGE: Record<string, string> = {
  active: STATUS_SUCCESS_BADGE,
  completed: STATUS_INFO_BADGE,
  cancelled: 'text-cult-text-muted border-cult-border bg-cult-surface-raised',
};

/** Harvest countdown color by days remaining */
export function harvestCountdownColor(days: number | null): string {
  if (days === null) return 'text-cult-text-secondary';
  if (days < 0) return STATUS_ERROR_TEXT;
  if (days <= 7) return STATUS_WARN_TEXT;
  return 'text-cult-text-secondary';
}
