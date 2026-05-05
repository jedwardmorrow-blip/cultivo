import { useState, useMemo } from 'react';
import type { StrainPosition } from '../../hooks/useStrainPosition';
import { StrainDetail } from './StrainDetail';
import { fmtLbsCompact, gToLbs } from './format';

interface MenuViewProps {
  positions: StrainPosition[];
  search: string;
}

export function MenuView({ positions, search }: MenuViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = search.trim()
      ? positions.filter((p) => p.strain.toLowerCase().includes(search.toLowerCase()))
      : positions;
    // Sort: graded supply first, then by total available
    return [...list].sort((a, b) => {
      if (b.graded_g !== a.graded_g) return b.graded_g - a.graded_g;
      return b.ungraded_g + b.units_available * 7 - (a.ungraded_g + a.units_available * 7);
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
      {filtered.map((p, idx) => {
        const isExpanded = expanded === p.strain;
        const isOver = p.state === 'over_committed';
        return (
          <div key={p.strain} className={idx > 0 ? 'border-t border-cult-border' : ''}>
            <button
              onClick={() => setExpanded(isExpanded ? null : p.strain)}
              className="w-full flex items-center px-5 py-3 hover:bg-cult-surface-raised transition-colors text-left"
            >
              <span
                className={`font-mono text-cult-text-muted text-xs w-4 flex-shrink-0 ${
                  isExpanded ? 'text-cult-text-primary' : ''
                }`}
                aria-hidden="true"
              >
                {isExpanded ? '–' : '+'}
              </span>
              <span className="text-sm text-cult-text-primary font-medium ml-2 w-48 flex-shrink-0 truncate">
                {p.strain}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {p.cult_g > 0 && <GradeWeight code="CULT" g={p.cult_g} accent />}
                {p.b_g > 0 && <GradeWeight code="B" g={p.b_g} />}
                {p.c_g > 0 && <GradeWeight code="C" g={p.c_g} />}
                {p.d_g > 0 && <GradeWeight code="D" g={p.d_g} />}
                {p.units_available > 0 && (
                  <span className="text-xs text-cult-text-secondary tabular-nums font-mono">
                    {p.units_available} units
                  </span>
                )}
                {p.ungraded_g > 0 && (
                  <span className="text-xs text-cult-text-secondary tabular-nums font-mono opacity-60">
                    + {fmtLbsCompact(p.ungraded_g)} ungraded
                  </span>
                )}
              </div>
              {isOver && (
                <span className="text-xs font-mono uppercase tracking-wider text-cult-danger ml-2 flex-shrink-0">
                  OVER {Math.abs(gToLbs(p.quotable_net_g)).toFixed(1)} lbs
                </span>
              )}
              {!isOver && p.open_orders > 0 && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-cult-text-muted ml-2 flex-shrink-0">
                  {p.open_orders} open
                </span>
              )}
            </button>
            {isExpanded && <StrainDetail strain={p.strain} />}
          </div>
        );
      })}
    </div>
  );
}

function GradeWeight({ code, g, accent }: { code: string; g: number; accent?: boolean }) {
  return (
    <span className="flex items-baseline gap-1 text-xs">
      <span
        className={`font-mono uppercase tracking-wider text-[10px] ${
          accent ? 'text-cult-text-primary font-semibold' : 'text-cult-text-secondary'
        }`}
      >
        {code}
      </span>
      <span
        className={`tabular-nums font-mono ${
          accent ? 'text-cult-text-primary font-semibold' : 'text-cult-text-primary'
        }`}
      >
        {fmtLbsCompact(g)}
      </span>
    </span>
  );
}
