import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { MenuView } from '@/features/inventory/components/sales-position';
import type { StrainPosition } from '@/features/inventory/hooks/useStrainPosition';
import { PraxisAtom } from './praxis-atom/PraxisAtom';
import './bureau-v4-stress.css';

const COG = (
  <svg viewBox="0 0 56 56" fill="none" aria-hidden style={{ width: 48, height: 48 }}>
    <circle cx="28" cy="28" r="20" stroke="#C9A24B" strokeWidth="1.2" />
    <circle cx="28" cy="28" r="13" stroke="#C9A24B" strokeWidth="1" />
    <circle cx="28" cy="28" r="3.4" fill="#C42130" />
    {Array.from({ length: 12 }).map((_, i) => {
      const rad = (i * 30 * Math.PI) / 180;
      return (
        <line
          key={i}
          x1={28 + Math.cos(rad) * 20}
          y1={28 + Math.sin(rad) * 20}
          x2={28 + Math.cos(rad) * 24}
          y2={28 + Math.sin(rad) * 24}
          stroke="#C9A24B"
          strokeWidth="1"
        />
      );
    })}
  </svg>
);

// Fixture data: 14 realistic strain positions to stress-test the dense list
const STRAINS = [
  'Blue Dream', 'Gorilla Glue #4', 'Pink Kush', 'Wedding Cake', 'Black Maple',
  'Ice Cream Cake', 'Magic Marker', 'Butter Breath', 'Cap Junky', 'Grape MTN',
  'Hawaiian Snowcone', 'Kiwi Melon Smacks', 'Chile Azul', 'Genetics Library',
];

const MOCK_POSITIONS: StrainPosition[] = STRAINS.map((strain, i) => {
  const cult = (i * 137 + 89) % 6500;
  const b = (i * 211 + 41) % 4200;
  const c = (i * 73 + 17) % 2600;
  const d = (i * 53 + 23) % 1100;
  const ungraded = (i * 29 + 11) % 7400;
  const units = (i * 7 + 3) % 28;
  const open_demand = (i * 197 + 13) % 5800;
  const open_orders = (i * 5 + 1) % 6;
  const graded = cult + b + c + d;
  const total = graded + ungraded;
  const exposed = open_demand;
  const quotable_net = graded - exposed;
  const isOver = i === 2 || i === 9;
  const isLow = i === 5 || i === 11;
  let state: StrainPosition['state'];
  if (isOver) state = 'over_committed';
  else if (isLow) state = 'limited';
  else state = graded > 0 ? 'available' : 'limited';
  return {
    strain,
    graded_g: graded,
    ungraded_g: ungraded,
    units_available: units,
    cult_g: cult,
    b_g: b,
    c_g: c,
    d_g: d,
    package_count: units,
    open_demand_g: open_demand,
    open_orders,
    locked_qty: 0,
    earliest_delivery: null,
    last_updated: null,
    quotable_net_g: isOver ? -Math.abs(quotable_net) - 1500 : quotable_net,
    total_net_g: total,
    exposed_g: exposed,
    state,
  } as StrainPosition;
});

function fmtLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

export function V4StressTest({ mode }: { mode: 'sales' | 'pin' }) {
  if (mode === 'sales') return <V4SalesStress />;
  return <V4PinStress />;
}

function V4SalesStress() {
  const [search, setSearch] = useState('');
  const summary = MOCK_POSITIONS.reduce(
    (acc, p) => ({
      gradedG: acc.gradedG + p.graded_g,
      ungradedG: acc.ungradedG + p.ungraded_g,
      demandG: acc.demandG + p.open_demand_g,
      overCount: acc.overCount + (p.state === 'over_committed' ? 1 : 0),
      lowCount: acc.lowCount + (p.state === 'limited' ? 1 : 0),
      strainCount: acc.strainCount + 1,
    }),
    { gradedG: 0, ungradedG: 0, demandG: 0, overCount: 0, lowCount: 0, strainCount: 0 }
  );

  return (
    <div className="bureau-v4">
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
          <PraxisAtom size={20} ariaLabel="System live" />
          <span>SYSTEM LIVE · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        </div>
      </div>

      <div className="bv4-page">
        <div className="bv4-page-header">
          <div className="left">
            <div className="meta">
              <span style={{ color: 'var(--pv4-gold)' }}>SALES · LEO</span>
              <span>·</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</span>
            </div>
            <div className="bv4-title">
              SALES INVENTORY<span className="period" />
            </div>
            <div className="bv4-tagline">
              <span className="bv4-num-lead">{fmtLbs(summary.gradedG)}</span>
              <span className="bv4-num-unit">LBS QUOTABLE</span>
              <span className="bv4-num-lead">{fmtLbs(summary.ungradedG)}</span>
              <span className="bv4-num-unit">LBS UNGRADED</span>
              <span className="bv4-num-lead">{fmtLbs(summary.demandG)}</span>
              <span className="bv4-num-unit">LBS OPEN DEMAND</span>
              <span className="bv4-num-lead">{summary.strainCount}</span>
              <span className="bv4-num-unit">STRAINS</span>
            </div>
          </div>
          <div className="right">
            <div className="bv4-status-bad"><strong>{summary.overCount} OVER-COMMITTED</strong></div>
            <div style={{ marginTop: 4 }} className="bv4-status-warn"><strong>{summary.lowCount} LOW STOCK</strong></div>
            <div style={{ marginTop: 4 }}>UPDATED 02 MIN AGO</div>
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

        {/* Dense-row container bumps row hairline to --op-rule-mid via
            cult-border / --op-line cascade. Refinement B from doctrine. */}
        <div className="bv4-dense-rows">
          <MenuView positions={MOCK_POSITIONS} search={search} />
        </div>

        {/* Tier 2 instrument — bottom plate dropped (refinement D from
            doctrine). SHEET numbering reserves for Tier 1 ceremonial
            until SHEET binds to real page numbering. */}
      </div>
    </div>
  );
}

function V4PinStress() {
  const [pin, setPin] = useState('');
  const PIN_LENGTH = 4;

  const onDigit = (d: string) => setPin((p) => (p.length < 6 ? p + d : p));
  const onBack = () => setPin((p) => p.slice(0, -1));

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="bureau-v4 bureau-v4-tablet">
      <div className="bv4-pin-stack">
        {COG}
        <div className="bv4-pin-mark">
          CULTIVO<span className="period" />
        </div>
        <div className="bv4-pin-tag">WORKER · PIN ACCESS</div>

        <div className="bv4-pin-fig">
          <span className="serial">FIG. 03</span>
          <span className="sep">·</span>
          <span>FLOOR LOGIN</span>
          <span className="sep">·</span>
          <span>4-DIGIT PIN</span>
        </div>

        <div className="bv4-pin-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`bv4-pin-dot ${i < pin.length ? 'is-filled' : ''}`}
              style={{ opacity: i < PIN_LENGTH ? 1 : 0.4 }}
            />
          ))}
        </div>

        <div className="bv4-numpad">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'back') {
              return (
                <button key={i} onClick={onBack} className="bv4-numkey is-back">
                  ⌫
                </button>
              );
            }
            return (
              <button key={i} onClick={() => onDigit(d)} className="bv4-numkey">
                {d}
              </button>
            );
          })}
        </div>

        <div className="bv4-pin-foot">
          ASK YOUR MANAGER FOR YOUR PIN
        </div>
      </div>
    </div>
  );
}
