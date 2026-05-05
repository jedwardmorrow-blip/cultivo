import { useState, useMemo } from 'react';
import type { StrainPosition, StrainState } from '../../hooks/useStrainPosition';
import { StrainDetail } from './StrainDetail';
import { fmtLbsCompact, fmtLbs, gToLbs } from './format';

interface PositionViewProps {
  positions: StrainPosition[];
  search: string;
}

const STATE_RANK: Record<StrainState, number> = {
  over_committed: 0,
  allocated: 1,
  ready: 2,
  blocked: 3,
  empty: 4,
};

export function PositionView({ positions, search }: PositionViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = search.trim()
      ? positions.filter((p) => p.strain.toLowerCase().includes(search.toLowerCase()))
      : positions;
    return [...list].sort((a, b) => {
      const rankDiff = STATE_RANK[a.state] - STATE_RANK[b.state];
      if (rankDiff !== 0) return rankDiff;
      // Within state: by absolute net position (largest exposure or surplus first)
      if (a.state === 'over_committed') return a.quotable_net_g - b.quotable_net_g;
      return b.graded_g - a.graded_g;
    });
  }, [positions, search]);

  if (filtered.length === 0) {
    return (
      <div className="bg-cult-surface border border-cult-border rounded p-12 text-center">
        <p className="text-cult-text-secondary text-sm">
          {search ? `No strains match "${search}"` : 'No sellable inventory available'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-cult-surface border border-cult-border rounded overflow-hidden">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_88px_88px_88px_88px_60px] items-center px-5 py-2 border-b border-cult-border bg-cult-surface-raised">
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted">
          strain
        </div>
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted text-right">
          quotable
        </div>
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted text-right">
          ungraded
        </div>
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted text-right">
          demand
        </div>
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted text-right">
          net
        </div>
        <div className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted text-right">
          state
        </div>
      </div>

      {filtered.map((p, idx) => {
        const isExpanded = expanded === p.strain;
        return (
          <div key={p.strain} className={idx > 0 ? 'border-t border-cult-border' : ''}>
            <button
              onClick={() => setExpanded(isExpanded ? null : p.strain)}
              className="w-full grid grid-cols-[1fr_88px_88px_88px_88px_60px] items-center px-5 py-2.5 hover:bg-cult-surface-raised transition-colors text-left"
            >
              <div className="flex items-center min-w-0">
                <span
                  className={`font-mono text-xs w-4 flex-shrink-0 ${
                    isExpanded ? 'text-cult-text-primary' : 'text-cult-text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {isExpanded ? '–' : '+'}
                </span>
                <span className="text-sm text-cult-text-primary ml-2 truncate">{p.strain}</span>
              </div>
              <span className="text-xs text-cult-text-primary tabular-nums font-mono text-right">
                {fmtLbsCompact(p.graded_g)}
              </span>
              <span className="text-xs text-cult-text-secondary tabular-nums font-mono text-right">
                {fmtLbsCompact(p.ungraded_g)}
              </span>
              <span className="text-xs text-cult-text-secondary tabular-nums font-mono text-right">
                {fmtLbsCompact(p.open_demand_g)}
              </span>
              <span
                className={`text-xs tabular-nums font-mono font-semibold text-right ${
                  p.state === 'over_committed' ? 'text-cult-danger' : 'text-cult-text-primary'
                }`}
              >
                {Math.abs(gToLbs(p.quotable_net_g)) < 0.05
                  ? '0.0'
                  : fmtLbs(p.quotable_net_g, { sign: true })}
              </span>
              <div className="text-right">
                <StateBadge state={p.state} />
              </div>
            </button>
            {isExpanded && <StrainDetail strain={p.strain} />}
          </div>
        );
      })}
    </div>
  );
}

function StateBadge({ state }: { state: StrainState }) {
  const map: Record<StrainState, { label: string; tone: string }> = {
    over_committed: { label: 'OVER', tone: 'text-cult-danger border-cult-danger' },
    allocated:     { label: 'ALLOC', tone: 'text-cult-warning border-cult-border-strong' },
    ready:         { label: 'READY', tone: 'text-cult-success border-cult-border-strong' },
    blocked:       { label: 'BLKD',  tone: 'text-cult-text-secondary border-cult-border' },
    empty:         { label: '—',     tone: 'text-cult-text-muted border-cult-border' },
  };
  const { label, tone } = map[state];
  return (
    <span
      className={`font-mono uppercase tracking-wider text-[9px] px-1.5 py-0.5 border ${tone}`}
    >
      {label}
    </span>
  );
}
