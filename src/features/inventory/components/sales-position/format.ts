// Shared formatters for sales position views.

const G_PER_LB = 453.592;

export function gToLbs(g: number): number {
  return g / G_PER_LB;
}

export function fmtLbs(g: number, opts: { sign?: boolean } = {}): string {
  const lbs = gToLbs(g);
  if (Math.abs(lbs) < 0.05) return opts.sign && lbs < 0 ? '−0.0' : '0.0';
  const fixed = lbs.toFixed(1);
  if (opts.sign) {
    if (lbs > 0) return `+${fixed}`;
    if (lbs < 0) return fixed.replace('-', '−');
  }
  return fixed;
}

export function fmtLbsCompact(g: number): string {
  if (g === 0) return '—';
  const lbs = gToLbs(g);
  if (lbs < 0.1) return '<0.1';
  return lbs.toFixed(1);
}
