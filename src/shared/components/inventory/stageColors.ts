/**
 * Canonical stage color map.
 *
 * The DB view `v_inventory_batch_stages` returns stage_name values like
 * "Binned", "Bucked", "Bulk", "Packaged", "Trim".  We look up by the
 * raw stage_name string so the keys are capitalised to match.
 */
export const STAGE_COLORS: Record<string, string> = {
  Binned: '#6366f1',   // indigo
  Bucked: '#8b5cf6',   // violet
  Bulk: '#10b981',     // emerald
  Packaged: '#06b6d4', // cyan
  Trim: '#78716c',     // stone
};

/** Format grams into a compact string — e.g. 1500 → "1.5kg", 350 → "350g" */
export function fmtGrams(g: number): string {
  if (g >= 1000) return (g / 1000).toFixed(1) + 'kg';
  return Math.round(g).toLocaleString() + 'g';
}
