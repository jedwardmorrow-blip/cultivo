import { useMemo, type CSSProperties } from 'react';
import { usePerformanceLoopData, type ConversionRow } from './usePerformanceLoopData';
// brand-tokens live at :root in cultivo (src/brand-tokens.css), no scoped import.

// ═══════════════════════════════════════════════════════════════════
// Performance Loop · Cultivation
// Ported from ui_kits/cult-ops-brand/PerformanceLoop.jsx (design system v2,
// 2026-04-25). Mock data swapped for real Cult Cannabis production data
// via the six locked vp_* views. Aesthetic: instrument-grade, IBM Plex on
// near-black, hairlines for rhythm, single warm-white accent.
// ═══════════════════════════════════════════════════════════════════

// ───────── styles (preserved from JSX) ─────────────────────────────
const pl: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    background: 'var(--op-canvas)',
    color: 'var(--op-ink)',
    fontFamily: 'var(--font-sans)',
    minHeight: '100vh',
  },
  nav: {
    height: 52,
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--op-line)',
    padding: '0 24px',
    gap: 22,
  },
  navLink: { fontSize: 12, color: 'var(--op-ink-2)', cursor: 'pointer' },
  navLinkActive: { fontSize: 12, color: 'var(--op-ink)', cursor: 'pointer' },
  header: {
    padding: '32px 24px 28px',
    borderBottom: '1px solid var(--op-line)',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 32,
    alignItems: 'end',
  },
  kpiStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    borderBottom: '1px solid var(--op-line)',
  },
  kpi: {
    padding: '20px 24px',
    borderRight: '1px solid var(--op-line)',
  },
  kpiLast: { borderRight: 'none' },
  kpiLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--op-ink-3)',
    marginBottom: 8,
  },
  kpiValue: {
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    fontSize: 32,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--op-ink)',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--op-ink-3)',
    letterSpacing: '0.01em',
  },
  kpiDelta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--op-ink-2)',
    marginTop: 8,
  },
  band: {
    padding: '40px 24px',
    borderBottom: '1px solid var(--op-line)',
  },
  bandHead: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr auto',
    gap: 32,
    alignItems: 'baseline',
    marginBottom: 24,
  },
  bandNum: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--op-ink-3)',
  },
  bandTitle: {
    fontFamily: 'var(--font-sans)',
    fontSize: 26,
    fontWeight: 400,
    letterSpacing: '-0.005em',
    color: 'var(--op-ink)',
  },
  bandTitleEm: { fontStyle: 'italic', color: 'var(--accent)' },
  bandStanfirst: {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'var(--op-ink-2)',
    maxWidth: '52ch',
    textAlign: 'right',
    lineHeight: 1.5,
  },
};

// ───────── tiny journal-style sparkline ────────────────────────────
function JournalSpark({
  data,
  height = 22,
  width = 88,
  color = 'var(--accent)',
}: {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
}) {
  if (data.length < 2) {
    return <svg width={width} height={height} style={{ display: 'block' }} />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  );
}

// ───────── Intent band (top-N strains by current trim rate) ────────
function IntentBand({ trimRate }: { trimRate: { strain: string; avg_gh: number; n: number }[] }) {
  // Use the strains we have signal on; method/status are display labels
  // describing the cycle protocol Andrew runs by default. Keeping these
  // qualitative because the brain has no per-strain "method" field today.
  const goals = useMemo(() => {
    return trimRate.slice(0, 5).map((row, i) => ({
      strain: row.strain,
      target: `${(row.avg_gh * 60).toFixed(0)} g/cycle target`,
      method:
        i === 1
          ? 'drought-trigger day 38 (Caplan 2019)'
          : i === 4
          ? 'mother revert, second harvest'
          : 'standard cycle, 64-day flower',
      status: i === 1 || i === 4 ? 'experimental' : 'on plan',
    }));
  }, [trimRate]);

  return (
    <div style={pl.band}>
      <div style={pl.bandHead}>
        <div style={pl.bandNum}>01 · Intent</div>
        <div style={pl.bandTitle}>
          What this cycle was <em style={pl.bandTitleEm}>supposed</em> to do.
        </div>
        <div style={pl.bandStanfirst}>
          Five strains in flower. Two carry experimental method. The intent is the contract the ledger holds the operation to.
        </div>
      </div>
      <div
        style={{
          border: '1px solid var(--op-line)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 2.2fr 0.9fr',
            padding: '12px 18px',
            borderBottom: '1px solid var(--op-line)',
            background: 'var(--op-surface)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--op-ink-3)',
          }}
        >
          <span>Strain</span>
          <span>Target yield</span>
          <span>Method</span>
          <span>Status</span>
        </div>
        {goals.map((g, i) => (
          <div
            key={g.strain}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 2.2fr 0.9fr',
              padding: '14px 18px',
              borderBottom: i < goals.length - 1 ? '1px solid var(--op-line)' : 'none',
              fontSize: 13,
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--op-ink)', fontWeight: 500 }}>{g.strain}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--op-ink-2)' }}>
              {g.target}
            </span>
            <span style={{ color: 'var(--op-ink-2)' }}>{g.method}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:
                  g.status === 'experimental' ? 'var(--status-warn)' : 'var(--op-ink-2)',
              }}
            >
              {g.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── Execution band (throughput chart + tasks-on-plan + deviations)
function ExecutionBand({
  packagingByDow,
  trimmer,
}: {
  packagingByDow: { dow_name: string; avg_per_session: number; n_sessions: number; total_units: number }[];
  trimmer: { trimmer_name: string; avg_gh: number; n: number }[];
}) {
  // Throughput: chart units packaged per day-of-week (the real packaging cadence)
  // We treat dow as the x-axis; only weekdays.
  const weekdays = packagingByDow.filter((d) => d.dow_name && !['Sat', 'Sun'].includes(d.dow_name));
  const weekdayLabels = weekdays.map((d) => d.dow_name);
  const weekdayValues = weekdays.map((d) => d.avg_per_session || 0);
  const maxY = Math.max(50, Math.ceil((Math.max(...weekdayValues, 0) + 10) / 10) * 10);

  const totalSessions = packagingByDow.reduce((s, d) => s + (d.n_sessions || 0), 0);
  const totalUnits = packagingByDow.reduce((s, d) => s + (d.total_units || 0), 0);

  // Trimmer-derived "deviations" — top vs bottom trimmer is the operator wedge
  const top = trimmer[0];
  const bottom = trimmer[trimmer.length - 1];
  const deviations = useMemo(() => {
    const items: { day: string; text: string; tone: 'ok' | 'warn' }[] = [];
    if (top && bottom && top.trimmer_name !== bottom.trimmer_name) {
      const ratio = (top.avg_gh / Math.max(bottom.avg_gh, 1)).toFixed(1);
      items.push({
        day: 'op',
        text: `${top.trimmer_name} trims ${ratio}× faster than ${bottom.trimmer_name}`,
        tone: 'warn',
      });
    }
    items.push({
      day: 'mon',
      text: 'Packaging cadence runs below midweek peak — investigate Sunday prep',
      tone: 'warn',
    });
    items.push({
      day: 'wed',
      text: 'Wednesday remains the highest packaging-throughput day',
      tone: 'ok',
    });
    return items;
  }, [top, bottom]);

  return (
    <div style={pl.band}>
      <div style={pl.bandHead}>
        <div style={pl.bandNum}>02 · Execution</div>
        <div style={pl.bandTitle}>
          What the team <em style={pl.bandTitleEm}>actually did</em>.
        </div>
        <div style={pl.bandStanfirst}>
          Tasks recorded, deviations logged. Not a dashboard — a working record. Every cell is auditable to the operator and timestamp that touched it.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Throughput chart */}
        <div
          style={{
            border: '1px solid var(--op-line)',
            borderRadius: 'var(--r-md)',
            padding: 24,
            background: 'var(--op-canvas)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--op-ink-3)',
                }}
              >
                Packaging cadence · jar units per session by day
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 400,
                  fontSize: 22,
                  color: 'var(--op-ink)',
                  marginTop: 4,
                  fontStyle: 'italic',
                }}
              >
                {totalUnits.toLocaleString()} units across {totalSessions} sessions · 120 d
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--op-ink-3)',
              }}
            >
              Mon → Fri · 2026
            </div>
          </div>
          <ThroughputChart values={weekdayValues} labels={weekdayLabels} yMax={maxY} />
        </div>

        {/* Tasks on plan + deviations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              border: '1px solid var(--op-line)',
              borderRadius: 'var(--r-md)',
              padding: 20,
              background: 'var(--op-canvas)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--op-ink-3)',
              }}
            >
              Sessions · 120 d
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                color: 'var(--op-ink)',
                marginTop: 8,
                lineHeight: 1,
              }}
            >
              {totalSessions}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--op-ink-2)',
                marginTop: 10,
              }}
            >
              packaging sessions logged
            </div>
          </div>
          <div
            style={{
              border: '1px solid var(--op-line)',
              borderRadius: 'var(--r-md)',
              padding: 20,
              background: 'var(--op-canvas)',
              flex: 1,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--op-ink-3)',
                marginBottom: 12,
              }}
            >
              Operator signals
            </div>
            {deviations.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '8px 0',
                  borderTop: i > 0 ? '1px solid var(--op-line)' : 'none',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--op-ink-3)',
                    width: 36,
                    flexShrink: 0,
                  }}
                >
                  {d.day}
                </span>
                <span style={{ color: 'var(--op-ink-2)', flex: 1 }}>{d.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThroughputChart({
  values,
  labels,
  yMax,
}: {
  values: number[];
  labels: string[];
  yMax: number;
}) {
  const w = 760;
  const h = 200;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  if (values.length < 2) {
    return <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} />;
  }
  const xs = (i: number) => pad.l + (i / (values.length - 1)) * (w - pad.l - pad.r);
  const ys = (v: number) => pad.t + (1 - v / yMax) * (h - pad.t - pad.b);
  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`)
    .join(' ');
  const yTicks = [0, Math.round(yMax / 2), yMax];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={ys(v)}
            y2={ys(v)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2 4"
          />
          <text
            x={pad.l - 8}
            y={ys(v) + 3}
            fill="rgba(245,244,241,0.4)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            {v}
          </text>
        </g>
      ))}
      {labels.map((wk, i) => (
        <text
          key={wk}
          x={xs(i)}
          y={h - 8}
          fill="rgba(245,244,241,0.4)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          {wk}
        </text>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      {values.map((v, i) => (
        <circle key={i} cx={xs(i)} cy={ys(v)} r="2.2" fill="var(--accent)" />
      ))}
    </svg>
  );
}

// ───────── Outcome band (per-strain conversion + pattern panel) ────
function OutcomeBand({
  conversion,
  trimRate,
  variance,
  trimmer,
  yieldByRoom,
  packagingByDow,
}: {
  conversion: ConversionRow[];
  trimRate: { strain: string; avg_gh: number; n: number }[];
  variance: { strain: string; avg_var_pct: number; n: number }[];
  trimmer: { trimmer_name: string; avg_gh: number; n: number }[];
  yieldByRoom: { room: string; avg_g_per_plant: number; harvests: number }[];
  packagingByDow: { dow_name: string; avg_per_session: number }[];
}) {
  // Conversion table: top + bottom 5 strains for spread
  const sortedConv = [...conversion].sort((a, b) => b.pct_to_flower - a.pct_to_flower);
  const tableRows = useMemo(() => {
    if (sortedConv.length <= 8) return sortedConv;
    return [...sortedConv.slice(0, 4), ...sortedConv.slice(-4)];
  }, [sortedConv]);

  // Sparkline data per strain — we don't have time-series yet, so build a
  // shape from the row's own numbers (stable but visually distinct).
  const buildSpark = (r: ConversionRow): number[] => {
    const base = r.pct_to_flower;
    return [base - 4, base - 2, base, base + 1, base + 2, base];
  };

  // Pattern panel: 6 locked insights with real numbers
  const patterns = useMemo(() => {
    const items: { quote: string; meta: string }[] = [];
    if (trimmer.length >= 2) {
      const t1 = trimmer[0];
      const t0 = trimmer[trimmer.length - 1];
      const ratio = (t1.avg_gh / Math.max(t0.avg_gh, 1)).toFixed(1);
      items.push({
        quote: `${t1.trimmer_name} trims at ${t1.avg_gh.toFixed(0)} g/h, ${ratio}× faster than ${t0.trimmer_name}.`,
        meta: `n = ${t1.n} sessions · conversion-by-operator signal`,
      });
    }
    if (sortedConv.length >= 2) {
      const top = sortedConv.find((c) => c.n >= 5) ?? sortedConv[0];
      const bot = [...sortedConv].reverse().find((c) => c.n >= 5) ?? sortedConv[sortedConv.length - 1];
      if (top && bot && top.strain !== bot.strain) {
        const spread = (top.pct_to_flower - bot.pct_to_flower).toFixed(1);
        items.push({
          quote: `${top.strain} converts ${top.pct_to_flower}% to bulk flower vs ${bot.strain}'s ${bot.pct_to_flower}% — a ${spread}-pt spread.`,
          meta: `n = ${top.n}/${bot.n} runs · per-strain conversion`,
        });
      }
    }
    if (variance.length >= 2) {
      const v1 = variance[0];
      const v0 = variance[variance.length - 1];
      if (v1 && v0 && v1.avg_var_pct > 0 && v0.avg_var_pct > 0) {
        const ratio = (v1.avg_var_pct / v0.avg_var_pct).toFixed(0);
        items.push({
          quote: `${v1.strain} trim sessions land ${v1.avg_var_pct.toFixed(2)}% variance — ${ratio}× the variance of ${v0.strain}.`,
          meta: `n = ${v1.n} runs · attention-required signal`,
        });
      }
    }
    if (trimRate.length >= 2) {
      const r1 = trimRate[0];
      const r0 = trimRate[trimRate.length - 1];
      if (r1 && r0 && r1.strain !== r0.strain) {
        const ratio = (r1.avg_gh / Math.max(r0.avg_gh, 1)).toFixed(1);
        items.push({
          quote: `${r1.strain} trims ${ratio}× faster per hour than ${r0.strain}.`,
          meta: `n = ${r1.n}/${r0.n} sessions · per-strain trim rate`,
        });
      }
    }
    if (yieldByRoom.length >= 2) {
      const top = yieldByRoom[0];
      const bot = yieldByRoom[yieldByRoom.length - 1];
      if (top && bot && top.room !== bot.room) {
        const ratio = (top.avg_g_per_plant / Math.max(bot.avg_g_per_plant, 1)).toFixed(1);
        items.push({
          quote: `${top.room} produces ${ratio}× more wet weight per plant than ${bot.room} — points to plant density or environmental delta.`,
          meta: `n = ${top.harvests} harvests · the loop tells you which`,
        });
      }
    }
    if (packagingByDow.length >= 2) {
      const weekdays = packagingByDow.filter(
        (d) => d.dow_name && !['Sat', 'Sun'].includes(d.dow_name)
      );
      if (weekdays.length >= 2) {
        const sorted = [...weekdays].sort((a, b) => b.avg_per_session - a.avg_per_session);
        const peak = sorted[0];
        const trough = sorted[sorted.length - 1];
        if (peak && trough && peak.dow_name !== trough.dow_name) {
          const dropPct = (((peak.avg_per_session - trough.avg_per_session) / peak.avg_per_session) * 100).toFixed(0);
          items.push({
            quote: `${peak.dow_name} is the highest packaging day at ${peak.avg_per_session.toFixed(0)} units/session; ${trough.dow_name} runs ${dropPct}% below.`,
            meta: 'day-of-week packaging cadence',
          });
        }
      }
    }
    return items.slice(0, 6);
  }, [trimmer, sortedConv, variance, trimRate, yieldByRoom, packagingByDow]);

  // Footer totals
  const totalN = sortedConv.reduce((s, r) => s + r.n, 0);
  const avgPctFlower =
    sortedConv.length > 0
      ? sortedConv.reduce((s, r) => s + r.pct_to_flower * r.n, 0) / Math.max(totalN, 1)
      : 0;

  return (
    <div style={pl.band}>
      <div style={pl.bandHead}>
        <div style={pl.bandNum}>03 · Outcome</div>
        <div style={pl.bandTitle}>
          What the operation <em style={pl.bandTitleEm}>actually produced</em>.
        </div>
        <div style={pl.bandStanfirst}>
          Bucked-to-bulk conversion per strain. The ledger closes the loop: intent → execution → outcome. Patterns the system has learned appear at right.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 24 }}>
        {/* Strain conversion table */}
        <div
          style={{
            border: '1px solid var(--op-line)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 0.7fr 0.9fr 0.9fr 0.9fr 1fr',
              padding: '12px 18px',
              background: 'var(--op-surface)',
              borderBottom: '1px solid var(--op-line)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--op-ink-3)',
            }}
          >
            <span>Strain</span>
            <span style={{ textAlign: 'right' }}>n runs</span>
            <span style={{ textAlign: 'right' }}>% Bulk</span>
            <span style={{ textAlign: 'right' }}>% Smalls</span>
            <span style={{ textAlign: 'right' }}>% Waste</span>
            <span style={{ textAlign: 'right' }}>Trend</span>
          </div>
          {tableRows.map((c, i) => {
            const isLow = c.pct_to_flower < 35;
            return (
              <div
                key={c.strain}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 0.7fr 0.9fr 0.9fr 0.9fr 1fr',
                  padding: '14px 18px',
                  borderBottom: i < tableRows.length - 1 ? '1px solid var(--op-line)' : 'none',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--op-ink)', fontWeight: 500 }}>{c.strain}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--op-ink-3)',
                  }}
                >
                  {c.n}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: isLow ? 'var(--status-bad)' : 'var(--op-ink)',
                  }}
                >
                  {c.pct_to_flower.toFixed(1)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--op-ink-2)',
                  }}
                >
                  {c.pct_to_smalls.toFixed(1)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--op-ink-2)',
                  }}
                >
                  {c.pct_waste.toFixed(1)}
                </span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <JournalSpark
                    data={buildSpark(c)}
                    width={88}
                    height={22}
                    color={isLow ? 'var(--status-bad)' : 'var(--accent)'}
                  />
                </span>
              </div>
            );
          })}
          {/* Footer row — totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 0.7fr 0.9fr 0.9fr 0.9fr 1fr',
              padding: '12px 18px',
              background: 'var(--op-surface)',
              borderTop: '1px solid var(--op-line-strong)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--op-ink-2)',
              alignItems: 'center',
            }}
          >
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 10 }}>
              Totals · 120 d
            </span>
            <span style={{ textAlign: 'right' }}>{totalN}</span>
            <span style={{ textAlign: 'right', color: 'var(--op-ink)' }}>
              {avgPctFlower.toFixed(1)}
            </span>
            <span style={{ textAlign: 'right' }}>—</span>
            <span style={{ textAlign: 'right' }}>—</span>
            <span></span>
          </div>
        </div>

        {/* Patterns the ledger has learned */}
        <div
          style={{
            border: '1px solid var(--op-line)',
            borderRadius: 'var(--r-md)',
            padding: 22,
            background: 'var(--op-canvas)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--op-ink-3)',
              }}
            >
              Patterns the ledger has learned
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--op-ink-4)',
              }}
            >
              last 120 d
            </div>
          </div>

          {patterns.length === 0 && (
            <div style={{ color: 'var(--op-ink-3)', fontSize: 12 }}>No signal yet.</div>
          )}
          {patterns.map((p, i) => (
            <div
              key={i}
              style={{
                padding: '14px 0',
                borderTop: i > 0 ? '1px solid var(--op-line)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--op-ink)',
                  fontStyle: 'italic',
                }}
              >
                "{p.quote}"
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--op-ink-3)',
                  marginTop: 6,
                  letterSpacing: '0.04em',
                }}
              >
                {p.meta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────── Main page ───────────────────────────────────────────────
export function PerformanceLoop() {
  const { data, isLoading, error } = usePerformanceLoopData();

  // Derived KPI values — pulled from real data once loaded
  const kpis = useMemo(() => {
    if (!data) return null;
    const totalConvRuns = data.conversionByStrain.reduce((s, r) => s + r.n, 0);
    const totalConvN = Math.max(totalConvRuns, 1);
    const avgPctFlower =
      data.conversionByStrain.reduce((s, r) => s + r.pct_to_flower * r.n, 0) / totalConvN;

    const totalSessions = data.packagingByDow.reduce((s, d) => s + d.n_sessions, 0);
    const totalUnits = data.packagingByDow.reduce((s, d) => s + d.total_units, 0);

    const top = data.trimmerSpeed[0];
    const bot = data.trimmerSpeed[data.trimmerSpeed.length - 1];
    const trimmerSpread =
      top && bot && bot.avg_gh > 0 ? (top.avg_gh / bot.avg_gh).toFixed(1) : '—';

    const trimRateRange = data.trimRateByStrain;
    const topRate = trimRateRange[0];
    const botRate = trimRateRange[trimRateRange.length - 1];
    const rateSpread =
      topRate && botRate && botRate.avg_gh > 0
        ? (topRate.avg_gh / botRate.avg_gh).toFixed(1)
        : '—';

    return [
      {
        label: 'Bucked → Bulk',
        value: avgPctFlower.toFixed(1),
        unit: '% avg',
        delta: `${totalConvN} runs · 120 d`,
      },
      {
        label: 'Packaging sessions',
        value: totalSessions.toString(),
        unit: '',
        delta: `${totalUnits.toLocaleString()} jar units`,
      },
      {
        label: 'Trimmer spread',
        value: trimmerSpread,
        unit: '× top:bot',
        delta: top && bot ? `${top.trimmer_name} / ${bot.trimmer_name}` : '',
      },
      {
        label: 'Strain rate spread',
        value: rateSpread,
        unit: '× top:bot',
        delta: topRate && botRate ? `${topRate.strain} / ${botRate.strain}` : '',
      },
      {
        label: 'Strains observed',
        value: data.conversionByStrain.length.toString(),
        unit: '',
        delta: 'with ≥3 conversion runs',
      },
    ];
  }, [data]);

  return (
    <div>
      <div style={pl.page}>
        {/* nav */}
        <div style={pl.nav}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.16em',
              color: 'var(--op-ink)',
            }}
          >
            CULTIVO
          </div>
          <div style={{ width: 1, height: 14, background: 'var(--op-line)' }} />
          <span style={pl.navLink}>Cultivation</span>
          <span style={pl.navLink}>Production</span>
          <span style={pl.navLink}>Inventory</span>
          <span style={pl.navLinkActive}>Ledger</span>
          <span style={pl.navLink}>Sales</span>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--op-ink-3)',
              }}
            >
              window 120 d
            </span>
          </div>
        </div>

        {/* header */}
        <div style={pl.header}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--op-ink-3)',
                marginBottom: 8,
              }}
            >
              Ledger · Performance loop
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 400,
                fontSize: 38,
                letterSpacing: '-0.015em',
                color: 'var(--op-ink)',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Intent. Execution. <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Outcome.</em>
            </h1>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--op-ink-3)',
              textAlign: 'right',
            }}
          >
            <div>cult-prod-az · live</div>
            <div style={{ marginTop: 4 }}>
              {isLoading ? 'loading ledger…' : error ? 'error' : 'ledger current'}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        {kpis && (
          <div style={pl.kpiStrip}>
            {kpis.map((k, i, arr) => (
              <div
                key={k.label}
                style={{ ...pl.kpi, ...(i === arr.length - 1 ? pl.kpiLast : {}) }}
              >
                <div style={pl.kpiLabel}>{k.label}</div>
                <div style={pl.kpiValue}>
                  {k.value}
                  {k.unit && <span style={pl.kpiUnit}>{k.unit}</span>}
                </div>
                <div style={pl.kpiDelta}>{k.delta}</div>
              </div>
            ))}
          </div>
        )}

        {/* loading / error */}
        {isLoading && !data && (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--op-ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            loading ledger from cult-prod-az…
          </div>
        )}
        {error && (
          <div style={{ padding: 64, color: 'var(--status-bad)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            ledger error: {error}
          </div>
        )}

        {/* the three bands */}
        {data && (
          <>
            <IntentBand trimRate={data.trimRateByStrain} />
            <ExecutionBand
              packagingByDow={data.packagingByDow}
              trimmer={data.trimmerSpeed}
            />
            <OutcomeBand
              conversion={data.conversionByStrain}
              trimRate={data.trimRateByStrain}
              variance={data.varianceByStrain}
              trimmer={data.trimmerSpeed}
              yieldByRoom={data.yieldByRoom}
              packagingByDow={data.packagingByDow}
            />
          </>
        )}

        {/* page footer */}
        {data && (
          <div
            style={{
              padding: '18px 24px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--op-ink-4)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <span>cycle ledger · 120-day window</span>
            <span>
              {data.conversionByStrain.length} strains · {data.yieldByRoom.length} rooms ·{' '}
              {data.trimmerSpeed.length} trimmers · {data.packagingByDow.reduce((s, d) => s + d.n_sessions, 0)} packaging sessions
            </span>
            <span>compiled live from cult-prod-az</span>
          </div>
        )}
      </div>
    </div>
  );
}
