/**
 * Canonical stage color map.
 *
 * The DB view `v_inventory_batch_stages` returns stage_name values like
 * "Binned", "Bucked", "Bulk", "Packaged", "Trim".  We look up by the
 * raw stage_name string so the keys are capitalised to match.
 *
 * Color semantics (global standard):
 * ── Pipeline stages ──
 *   indigo  = Binned (raw, unprocessed)
 *   violet  = Bucked (first processing)
 *   cyan    = Bulk (trimmed, ready to package)
 *   emerald = Packaged (finished SKUs)
 *   amber   = Trim (byproduct)
 *
 * ── SKU types ──
 *   emerald = 3.5g Jars
 *   sky     = 14g Mylars
 *   violet  = 1lb Bags
 *
 * ── Status / age ──
 *   emerald = fresh / positive
 *   amber   = watch / caution
 *   red     = aging / critical
 *   gray    = normal / neutral
 *
 * ── Demand ──
 *   cyan    = committed demand / orders
 */
export const STAGE_COLORS: Record<string, string> = {
  Binned: '#6366f1',   // indigo
  Bucked: '#8b5cf6',   // violet
  Bulk: '#06b6d4',     // cyan (was emerald — realigned to match RemainingBar)
  Packaged: '#10b981', // emerald (was cyan — "done/finished" = green)
  Trim: '#f59e0b',     // amber (was stone — aligns with trim byproduct across all views)
};

/** SKU type colors — used by SkuSplitBar, SkuChips, SkuProjectionBadge
 *
 *  emerald = 3.5g Jars (primary retail unit)
 *  sky     = 14g Mylars
 *  violet  = 1lb Bags (bulk wholesale)
 *  amber   = Trim (sellable bulk byproduct)
 *  rose    = Prerolls (1g pre-rolled joints)
 */
export const SKU_COLORS = {
  '3.5g':    { hex: '#10b981', bg: 'bg-cult-success',       text: 'text-cult-success-bright', label: '3.5g Jars' },
  '14g':     { hex: '#0ea5e9', bg: 'bg-cult-stage-clone',   text: 'text-cult-stage-clone',    label: '14g Mylars' },
  '1lb':     { hex: '#8b5cf6', bg: 'bg-cult-stage-cure',    text: 'text-cult-stage-cure',     label: '1lb Bags' },
  'trim':    { hex: '#f59e0b', bg: 'bg-cult-stage-harvest',  text: 'text-cult-stage-harvest',  label: 'Trim' },
  'preroll': { hex: '#f43f5e', bg: 'bg-cult-stage-flower',   text: 'text-cult-stage-flower',   label: '1g Prerolls' },
} as const;

/** Format grams into a compact string using kg threshold */
export function fmtGrams(g: number): string {
  if (g >= 1000) return (g / 1000).toFixed(1) + ' kg';
  return Math.round(g).toLocaleString() + 'g';
}
