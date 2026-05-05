import { useStrainDetail } from '../../hooks/useStrainPosition';
import { fmtLbsCompact } from './format';

interface StrainDetailProps {
  strain: string;
}

const STAGE_ORDER: Record<string, number> = {
  Packaged: 0,
  Trimmed: 1,
  Bucked: 2,
  Binned: 3,
};

export function StrainDetail({ strain }: StrainDetailProps) {
  const { packages, orders, loading } = useStrainDetail(strain);

  if (loading) {
    return (
      <div className="px-6 py-4 text-xs text-cult-text-secondary font-mono">
        loading…
      </div>
    );
  }

  // Group packages by stage, then sort by stage order
  const byStage: Record<string, typeof packages> = {};
  for (const p of packages) {
    const key = p.stage || 'Other';
    if (!byStage[key]) byStage[key] = [];
    byStage[key].push(p);
  }
  const stages = Object.keys(byStage).sort(
    (a, b) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99)
  );

  return (
    <div className="grid grid-cols-2 gap-px bg-cult-border">
      {/* Supply panel */}
      <div className="bg-cult-surface px-5 py-4">
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-secondary mb-3">
          supply · {packages.length} package{packages.length !== 1 ? 's' : ''}
        </div>
        {stages.length === 0 ? (
          <div className="text-xs text-cult-text-secondary">No supply</div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage}>
                <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted mb-1">
                  {stage}
                </div>
                <div className="space-y-1">
                  {byStage[stage].map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-cult-text-muted text-[10px] w-12 flex-shrink-0">
                          {p.batch ?? '—'}
                        </span>
                        <GradeChip code={p.grade_code} />
                      </div>
                      <span className="text-cult-text-primary tabular-nums font-mono">
                        {p.unit === 'g' || p.unit === 'grams'
                          ? `${fmtLbsCompact(p.available_qty)} lbs`
                          : `${p.available_qty} ${p.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demand panel */}
      <div className="bg-cult-surface px-5 py-4">
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-secondary mb-3">
          open demand · {orders.length} line{orders.length !== 1 ? 's' : ''}
        </div>
        {orders.length === 0 ? (
          <div className="text-xs text-cult-text-secondary">No open orders</div>
        ) : (
          <div className="space-y-1.5">
            {orders.map((o, i) => (
              <div
                key={`${o.order_id}-${i}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono text-cult-text-muted text-[10px] flex-shrink-0">
                    {o.order_number ?? '—'}
                  </span>
                  <span className="text-cult-text-secondary truncate">
                    {o.product_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {o.delivery_date && (
                    <span className="text-[10px] text-cult-text-muted font-mono">
                      {o.delivery_date}
                    </span>
                  )}
                  <span className="text-cult-text-primary tabular-nums font-mono">
                    {fmtLbsCompact(o.grams_needed)} lbs
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GradeChip({ code }: { code: string | null }) {
  if (!code) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-cult-border text-cult-text-muted">
        ungraded
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-cult-border-strong text-cult-text-primary">
      {code}
    </span>
  );
}
