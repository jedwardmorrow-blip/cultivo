/**
 * Task and priority color tokens for the cultivation module.
 *
 * Semantic color rules:
 *   Task type  = primary color identity (the main signal per task element)
 *   Room type  = secondary muted border/background only
 *   Status     = icon-first; color is supporting signal only
 *   Priority   = single amber/yellow accent — never red/green/blue
 *
 * Task type colors live in TASK_TYPE_CONFIG (cultivation.types.ts).
 * Use getTaskTypeConfig(t).color for all task-type color lookups.
 */

/** Room type display meta — label, hex, and Tailwind muted bg/border.
 *  Use for room section headers and room-type badges only.
 *  Never use these as the dominant color when task type is also visible. */
export const ROOM_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  mother: { label: 'Mother',     color: '#D97706', bg: 'bg-amber-950/40',   border: 'border-amber-700/40'   },
  clone:  { label: 'Clone',      color: '#0EA5E9', bg: 'bg-sky-950/40',     border: 'border-sky-700/40'     },
  veg:    { label: 'Vegetation', color: '#10B981', bg: 'bg-emerald-950/40', border: 'border-emerald-700/40' },
  flower: { label: 'Flower',     color: '#F43F5E', bg: 'bg-rose-950/40',    border: 'border-rose-700/40'    },
  mixed:  { label: 'Mixed',      color: '#6B7280', bg: 'bg-gray-900/40',    border: 'border-gray-600/40'    },
};

/** Room type hex values for inline borderLeftColor / backgroundColor only.
 *  For Tailwind class usage prefer ROOM_TYPE_COLORS in stageColors.ts. */
export const ROOM_TYPE_HEX: Record<string, string> = {
  mother: '#D97706',
  clone:  '#0EA5E9',
  veg:    '#10B981',
  flower: '#F43F5E',
  mixed:  '#6B7280',
};

/**
 * Priority uses a single amber accent — high, medium, and low all stay in the
 * amber/neutral palette.  Never add red, green, or blue priority indicators.
 */
export const PRIORITY_COLOR: Record<string, {
  text: string;
  active: string;   // selected button state
  badge: string;    // read-only badge
  dot: string;      // small indicator dot (bg class)
  border: string;   // left-border accent (border-l-* class)
}> = {
  high: {
    text:   'text-amber-400',
    active: 'bg-amber-950/60 text-amber-400 border border-amber-700/50',
    badge:  'text-amber-400 bg-amber-950/40 rounded-sm border border-amber-800/30',
    dot:    'bg-amber-400',
    border: 'border-l-amber-500/60',
  },
  medium: {
    text:   'text-cult-border',
    active: 'bg-cult-surface-raised text-cult-text-primary border border-cult-border',
    badge:  'text-cult-border bg-cult-surface-raised/50 rounded-sm border border-cult-surface/40',
    dot:    'bg-amber-400',
    border: '',
  },
  low: {
    text:   'text-cult-surface',
    active: 'bg-cult-surface-raised text-cult-text-muted border border-cult-border',
    badge:  'text-cult-surface bg-cult-surface-raised/30 rounded-sm border border-cult-surface/30',
    dot:    'bg-zinc-500',
    border: '',
  },
};
