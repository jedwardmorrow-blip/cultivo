import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

const fmtUSD = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
};

const fmtLbs = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
};

// Stage-color dots for the 4 conversion stages, per CLAUDE.md "6px markers only".
const STAGE_DOT: Record<string, string> = {
  Binned: 'var(--stage-flower)',
  Bucked: 'var(--stage-clone)',
  Trimmed: 'var(--stage-cure)',
  Packaged: 'var(--stage-package)',
};

export function InventoryRibbon() {
  const { data, loading } = useDashboardData();
  const stages = data?.funnel ?? [];
  const totalRaw = stages.reduce((s, st) => s + st.lbs, 0);
  const totalFinished = stages.reduce((s, st) => s + st.finishedLbs, 0);
  const totalRevenue = stages.reduce((s, st) => s + st.revenueEst, 0);

  // Tier C #B: stage-color proportional stripe — single glance "what's the mix"
  // without reading individual cell numbers. Each segment width is the stage's
  // share of total raw lbs. Uses 6px stage-color markers per the design contract.
  const totalForStripe = Math.max(totalRaw, 1);
  const stripeSegments = stages.map((st) => ({
    label: st.label,
    pct: (st.lbs / totalForStripe) * 100,
    color: STAGE_DOT[st.label] ?? 'var(--accent)',
  }));

  return (
    <div className="fpl-inv-ribbon">
      <div className="fpl-inv-ribbon-cap">
        <div className="fpl-inv-eyebrow">
          INVENTORY · CONVERSION CASCADE
        </div>
        <div className="fpl-inv-totals">
          <span>{fmtLbs(totalRaw)} <span className="unit">lbs raw</span></span>
          <span className="arrow">→</span>
          <span>{fmtLbs(totalFinished)} <span className="unit">lbs finished est</span></span>
          <span className="rev">{fmtUSD(totalRevenue)}</span>
        </div>
      </div>

      {totalRaw > 0 && (
        <div className="fpl-inv-stripe" aria-hidden="true">
          {stripeSegments.map((seg) => (
            <div
              key={seg.label}
              className="fpl-inv-stripe-seg"
              style={{ width: `${seg.pct}%`, background: seg.color }}
            />
          ))}
        </div>
      )}

      <div className="fpl-inv-grid">
        {(stages.length === 0 ? [] : stages).map((st) => {
          const conversionPct =
            st.lbs > 0 && st.finishedLbs > 0 && st.lbs !== st.finishedLbs
              ? Math.round((st.finishedLbs / st.lbs) * 100)
              : null;
          return (
            <div key={st.label} className="fpl-inv-cell">
              <div className="fpl-inv-cell-eyebrow">
                <span
                  className="dot"
                  style={{ background: STAGE_DOT[st.label] ?? 'var(--accent)' }}
                />
                {st.label.toUpperCase()}
              </div>
              <div className="fpl-inv-cell-val">
                {fmtLbs(st.lbs)}<span className="unit">lbs</span>
              </div>
              <div className="fpl-inv-cell-sub">
                {conversionPct != null ? (
                  <>→ {fmtLbs(st.finishedLbs)} lbs · {conversionPct}%</>
                ) : (
                  <>→ {fmtLbs(st.finishedLbs)} lbs finished</>
                )}
              </div>
              <div className="fpl-inv-cell-rev">{fmtUSD(st.revenueEst)}</div>
            </div>
          );
        })}
        {stages.length === 0 && (
          <div className="fpl-inv-cell" style={{ gridColumn: '1 / -1' }}>
            <div className="fpl-inv-cell-sub" style={{ color: 'var(--op-ink-3)' }}>
              {loading ? 'loading inventory pipeline…' : 'no inventory in process'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
