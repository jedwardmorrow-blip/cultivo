/**
 * Consolidated stage color tokens for the cultivation module.
 *
 * Per CLAUDE.md > Banned patterns:
 *   - Stage colors are 6px DOT MARKERS only.
 *   - Never used as fills, tinted backgrounds, or borders on chip bodies.
 *   - Chip surface = neutral (bg-cult-surface, border-cult-border-subtle).
 *   - Stage identity = a leading 6px dot using bg-cult-stage-X.
 *
 * The legacy maps below (STAGE_BADGE, CHIP_STAGE_COLORS, ROOM_TYPE_COLORS,
 * ROOM_TYPE_BADGE, ROOM_TYPE_TEXT) all return neutral chip styling. The
 * dot color comes from ROOM_TYPE_DOT (kept) and the new STAGE_DOT.
 *
 * Tokens used:
 *   clone → cult-stage-clone (#0EA5E9)
 *   veg   → cult-stage-veg   (#10B981)
 *   flower→ cult-stage-flower (#F43F5E)
 *   harvest→ cult-stage-harvest (#F59E0B)
 */

/** Neutral chip surface for stage badges. Pair with STAGE_DOT for the marker. */
const NEUTRAL_CHIP = 'border-cult-border-subtle bg-cult-surface text-cult-text-secondary';

/** Badge classes for growth stage labels (text + border + bg) — neutral surface. */
export const STAGE_BADGE: Record<string, string> = {
  clone: NEUTRAL_CHIP,
  veg: NEUTRAL_CHIP,
  flower: NEUTRAL_CHIP,
  harvested: NEUTRAL_CHIP,
};

/** Chip classes for batch summary chips by room type — neutral surface. */
export const CHIP_STAGE_COLORS: Record<string, string> = {
  clone: NEUTRAL_CHIP,
  veg: NEUTRAL_CHIP,
  flower: NEUTRAL_CHIP,
  mother: NEUTRAL_CHIP,
  mixed: NEUTRAL_CHIP,
};

/** Room card border + bg by room type — neutral surface, no tinted bg. */
export const ROOM_TYPE_COLORS: Record<string, string> = {
  clone: 'border-cult-border bg-cult-surface',
  veg: 'border-cult-border bg-cult-surface',
  flower: 'border-cult-border bg-cult-surface',
  mother: 'border-cult-border bg-cult-surface',
  mixed: 'border-cult-border-strong bg-cult-surface',
};

/** Room type border accent for drawer / detail views — neutral. */
export const ROOM_TYPE_BORDER: Record<string, string> = {
  clone: 'border-cult-border',
  veg: 'border-cult-border',
  flower: 'border-cult-border',
  mother: 'border-cult-border',
  mixed: 'border-cult-border-strong',
};

/** Left-border accent for list rows — neutral hairline. Stage identity comes from a dot. */
export const ROOM_TYPE_LEFT_BORDER: Record<string, string> = {
  clone: 'border-l-cult-border-strong',
  veg: 'border-l-cult-border-strong',
  flower: 'border-l-cult-border-strong',
  mother: 'border-l-cult-border-strong',
  mixed: 'border-l-cult-border',
};

/** Solid bg color for room-type 6px DOT indicators (the canonical stage-color use). */
export const ROOM_TYPE_DOT: Record<string, string> = {
  clone: 'bg-cult-stage-clone',
  veg: 'bg-cult-stage-veg',
  flower: 'bg-cult-stage-flower',
  mother: 'bg-cult-stage-harvest',
  mixed: 'bg-cult-border',
};

/** Solid bg color for growth-stage 6px DOT indicators. */
export const STAGE_DOT: Record<string, string> = {
  clone: 'bg-cult-stage-clone',
  veg: 'bg-cult-stage-veg',
  flower: 'bg-cult-stage-flower',
  harvest: 'bg-cult-stage-harvest',
  cure: 'bg-cult-stage-cure',
  package: 'bg-cult-stage-package',
  harvested: 'bg-cult-text-faint',
};

/** Text + border accent for room-type labels (no background) — neutral. */
export const ROOM_TYPE_TEXT: Record<string, string> = {
  clone: 'text-cult-text-secondary border-cult-border',
  veg: 'text-cult-text-secondary border-cult-border',
  flower: 'text-cult-text-secondary border-cult-border',
  mother: 'text-cult-text-secondary border-cult-border',
  mixed: 'text-cult-text-secondary border-cult-border',
};

/** Full badge classes for settings / management views — neutral surface. */
export const ROOM_TYPE_BADGE: Record<string, string> = {
  clone: NEUTRAL_CHIP,
  veg: NEUTRAL_CHIP,
  flower: NEUTRAL_CHIP,
  mother: NEUTRAL_CHIP,
  mixed: NEUTRAL_CHIP,
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
