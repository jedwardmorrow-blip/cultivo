import { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useStrainPosition } from '../hooks/useStrainPosition';
import { MenuView, PositionView, fmtLbsCompact } from './sales-position';
import '@/features/auth/components/bureau-v4-stress.css';

type Layout = 'menu' | 'position';

/**
 * Sales Inventory · V4 Bureau Tier 2 instrument port (session 477).
 *
 * Sandbox-scoped under .bureau-v4 .bureau-sales. Inherits --op-* token
 * overrides from bureau-v4-stress.css so the cult-* utility classes used
 * by the inner MenuView / PositionView render in V4 Bureau colors without
 * code changes to those components.
 *
 * Tier 2 instrument elements applied to the page chrome:
 *   - Bureau serial plate (FIG. 02 · SALES INVENTORY · GRADE-FIRST · CULT CANNABIS)
 *   - Page header with meta, Big Shoulders title, bv4-tagline KPI strip
 *   - Right-side status block with over-committed count
 *   - Existing A/B layout switcher and search restyled as Bureau elements
 *   - .bv4-dense-rows wrapper around the menu/position list bumps
 *     hairline strength to --op-rule-mid for row-to-row scanning
 *
 * The Sales / Account Manager persona (cultivo_persona_sales_account_manager)
 * has Orders as its canonical default module per the persona spec; this
 * surface is the Sales Inventory view used during phone calls. Tier 2
 * instrument tier applies because the surface is a dense list with
 * comparison work — exactly what the doctrine prescribes for Tier 2.
 */
export function SalesInventoryView() {
  const { positions, loading, refetch } = useStrainPosition();
  const [layout, setLayout] = useState<Layout>('menu');
  const [search, setSearch] = useState('');

  // Top-line summary across all positions
  const summary = useMemo(() => {
    let gradedG = 0;
    let ungradedG = 0;
    let demandG = 0;
    let overCount = 0;
    let lowCount = 0;
    let strainCount = 0;
    for (const p of positions) {
      gradedG += p.graded_g;
      ungradedG += p.ungraded_g;
      demandG += p.open_demand_g;
      if (p.state === 'over_committed') overCount += 1;
      if (p.state === 'limited') lowCount += 1;
      if (p.graded_g > 0 || p.ungraded_g > 0 || p.units_available > 0) strainCount += 1;
    }
    return { gradedG, ungradedG, demandG, overCount, lowCount, strainCount };
  }, [positions]);

  const dateMeta = new Date()
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();

  return (
    <div className="bureau-v4 bureau-sales">
      {/* Bureau serial plate */}
      <div className="bv4-plate">
        <div className="stamp">
          <span className="serial">FIG. 02</span>
          <span className="sep">·</span>
          <span>SALES INVENTORY</span>
          <span className="sep">·</span>
          <span>GRADE-FIRST</span>
          <span className="sep">·</span>
          <span>CULT CANNABIS</span>
        </div>
        <div className="stamp" style={{ gap: 8 }}>
          <span className="live-dot" />
          <span>SYSTEM LIVE · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        </div>
      </div>

      <div className="bv4-page">
        {/* Page header — meta + Big Shoulders title + KPI tagline + status block */}
        <div className="bv4-page-header">
          <div className="left">
            <div className="meta">
              <span style={{ color: 'var(--pv4-gold)' }}>SALES · LEO</span>
              <span>·</span>
              <span>{dateMeta}</span>
            </div>
            <div className="bv4-title">
              SALES INVENTORY<span className="period" />
            </div>
            <div className="bv4-tagline">
              <span className="bv4-num-lead">{fmtLbsCompact(summary.gradedG)}</span>
              <span className="bv4-num-unit">LBS QUOTABLE</span>
              <span className="bv4-num-lead">{fmtLbsCompact(summary.ungradedG)}</span>
              <span className="bv4-num-unit">LBS UNGRADED</span>
              <span className="bv4-num-lead">{fmtLbsCompact(summary.demandG)}</span>
              <span className="bv4-num-unit">LBS OPEN DEMAND</span>
              <span className="bv4-num-lead">{summary.strainCount}</span>
              <span className="bv4-num-unit">STRAINS</span>
            </div>
          </div>
          <div className="right">
            {summary.overCount > 0 && (
              <div className="bv4-status-bad">
                <strong>{summary.overCount} OVER-COMMITTED</strong>
              </div>
            )}
            {summary.lowCount > 0 && (
              <div style={{ marginTop: 4 }} className="bv4-status-warn">
                <strong>{summary.lowCount} LOW STOCK</strong>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              {loading ? 'LOADING' : `${summary.strainCount} STRAINS LOADED`}
            </div>
            <button
              onClick={() => refetch()}
              title="Refresh"
              aria-label="Refresh"
              style={{
                marginTop: 8,
                background: 'transparent',
                border: '1px solid var(--pv4-rule)',
                color: 'var(--pv4-paper-mute)',
                padding: '4px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw style={{ width: 11, height: 11 }} />
              REFRESH
            </button>
          </div>
        </div>

        {/* A/B layout switcher — Bureau pill toggle, replaces prototype banner */}
        <div
          className="bv4-layout-toggle"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            margin: '0 0 16px',
            paddingTop: 4,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--pv4-paper-faint)',
            }}
          >
            <span style={{ color: 'var(--pv4-paper-mute)' }}>FIG. 03</span> · LAYOUT VARIANT
            · two views of the same data
          </div>
          <div
            style={{
              display: 'flex',
              border: '1px solid var(--pv4-rule)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setLayout('menu')}
              style={{
                padding: '5px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                background:
                  layout === 'menu' ? 'rgba(201, 162, 75, 0.18)' : 'transparent',
                color:
                  layout === 'menu'
                    ? 'var(--pv4-paper)'
                    : 'var(--pv4-paper-mute)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              A · MENU
            </button>
            <button
              onClick={() => setLayout('position')}
              style={{
                padding: '5px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                background:
                  layout === 'position' ? 'rgba(201, 162, 75, 0.18)' : 'transparent',
                color:
                  layout === 'position'
                    ? 'var(--pv4-paper)'
                    : 'var(--pv4-paper-mute)',
                border: 'none',
                borderLeft: '1px solid var(--pv4-rule)',
                cursor: 'pointer',
              }}
            >
              B · POSITION
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
          <Search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: 'rgba(241,232,210,0.55)',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH STRAINS"
            style={{
              width: '100%',
              padding: '9px 10px 9px 32px',
              background: 'rgba(241,232,210,0.04)',
              border: '1px solid rgba(201,162,75,0.32)',
              borderRadius: 0,
              color: '#F1E8D2',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              outline: 'none',
            }}
          />
        </div>

        {/* Body — dense-rows wrapper bumps cult-border to --op-rule-mid for
            list scanning. cult-* utilities cascade through V4 Bureau --op-*
            overrides; MenuView and PositionView render in V4 colors without
            code changes. */}
        <div className="bv4-dense-rows">
          {loading ? (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--pv4-paper-faint)',
                padding: 32,
                textAlign: 'center',
              }}
            >
              LOADING INVENTORY
            </div>
          ) : layout === 'menu' ? (
            <MenuView positions={positions} search={search} />
          ) : (
            <PositionView positions={positions} search={search} />
          )}
        </div>
      </div>
    </div>
  );
}
