import { useMemo, useState } from 'react';
import type { CalendarRoom, StrainCultivationStats, CalendarPlannedEntry } from '@/features/production-planner/types';
import type { Batch, MotherBatchGroup, MotherIndividual, MotherHealth } from './planner-mock';
import { useCycleConfig } from './CycleConfigContext';

interface HoldBackPick {
  strain_id: string;
  strain_name: string;
  plants: number;
}

interface MomPlanningDrawerProps {
  open: boolean;
  room: CalendarRoom | null;
  batches: Batch[];
  plannedByRoom: Record<string, CalendarPlannedEntry[]>;
  strainStats: StrainCultivationStats[];
  motherBatchGroups: MotherBatchGroup[];
  rooms: CalendarRoom[];
  onClose: () => void;
  onHoldBack: (group: MotherBatchGroup) => void;
  onRetireMom: (groupPrefix: string, momId: string) => void;
  onAddGenetics: (strainName: string) => void;
}

const MS_PER_DAY = 86400000;

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysFromToday(iso: string): number {
  const d = new Date(iso);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / MS_PER_DAY);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function healthLabel(h: MotherHealth): string {
  if (h === 'healthy') return 'OK';
  if (h === 'declining') return 'DECLINING';
  return 'REPLACE';
}

function healthClass(h: MotherHealth): string {
  if (h === 'healthy') return 'mom-h-ok';
  if (h === 'declining') return 'mom-h-warn';
  return 'mom-h-bad';
}

/* ─────────────────────────── ACTION QUEUE ────────────────────────── */

function ActionQueue({
  holdBackCandidates,
  replacements,
  onHoldBack,
  onRetireMom,
  onAddGenetics,
}: {
  holdBackCandidates: Array<{
    sourceRoomCode: string;
    flipISO: string;
    daysOut: number;
    strains: Array<{ strain_id: string; strain_name: string; plant_count: number }>;
    sourceCycleId: string;
    sourcePrefix: string;
  }>;
  replacements: Array<{ group: MotherBatchGroup; mom: MotherIndividual; reason: string }>;
  onHoldBack: (candidate: {
    sourceRoomCode: string;
    sourcePrefix: string;
    flipISO: string;
    strains: Array<{ strain_id: string; strain_name: string; plants: number }>;
  }) => void;
  onRetireMom: (groupPrefix: string, momId: string) => void;
  onAddGenetics: (name: string) => void;
}) {
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);
  const [picksByCard, setPicksByCard] = useState<Record<string, Record<string, number>>>({});
  const [intakeName, setIntakeName] = useState('');

  const setPickFor = (cardKey: string, strainId: string, plants: number) => {
    setPicksByCard((prev) => ({
      ...prev,
      [cardKey]: { ...(prev[cardKey] ?? {}), [strainId]: plants },
    }));
  };

  return (
    <section className="mom-section">
      <header className="mom-section-header">
        <span className="serial">FIG. 02</span>
        <span className="sep">·</span>
        <span>Action queue</span>
        <span className="cap mute" style={{ marginLeft: 'auto' }}>
          {holdBackCandidates.length + replacements.length} pending
        </span>
      </header>

      <div className="mom-section-body">
        {/* Hold-backs ready */}
        <div className="mom-action-bucket">
          <div className="mom-bucket-stamp cap mono">
            <span className="strong">HOLD-BACKS READY</span>
            <span className="mute">flips within 14 days</span>
            <span className="num">{holdBackCandidates.length}</span>
          </div>
          {holdBackCandidates.length === 0 ? (
            <div className="mom-empty">No upcoming flower-flips need a hold-back decision.</div>
          ) : (
            holdBackCandidates.map((c) => {
              const cardKey = `${c.sourceRoomCode}-${c.sourcePrefix}`;
              const expanded = expandedCardKey === cardKey;
              const picks = picksByCard[cardKey] ?? {};
              return (
                <div key={cardKey} className={`mom-action-card ${expanded ? 'is-open' : ''}`}>
                  <div className="mom-action-card-head">
                    <div>
                      <div className="cap mono mom-action-card-title">
                        <span className="strong">{c.sourceRoomCode}</span>
                        <span className="sep">·</span>
                        <span>{c.sourcePrefix}</span>
                        <span className="sep">·</span>
                        <span className="mute">flip {fmtDateShort(c.flipISO)}</span>
                        <span className="sep">·</span>
                        <span className="mute">{c.daysOut === 0 ? 'today' : `${c.daysOut}d out`}</span>
                      </div>
                      <div className="cap mute mom-action-card-sub">
                        {c.strains.length} strain{c.strains.length === 1 ? '' : 's'} · default 2 plants per strain
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mom-card-cta"
                      onClick={() => setExpandedCardKey(expanded ? null : cardKey)}
                      aria-expanded={expanded}
                    >
                      {expanded ? 'Cancel' : 'Hold back…'}
                    </button>
                  </div>
                  {expanded && (
                    <div className="mom-action-card-body">
                      <table className="mom-pick-table">
                        <thead>
                          <tr>
                            <th>Strain</th>
                            <th>Source plants</th>
                            <th>Hold back</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.strains.map((s) => {
                            const v = picks[s.strain_id] ?? 2;
                            return (
                              <tr key={s.strain_id}>
                                <td>{s.strain_name}</td>
                                <td className="num mute">{s.plant_count}</td>
                                <td>
                                  <input
                                    type="number"
                                    min={0}
                                    max={Math.max(2, s.plant_count)}
                                    value={v}
                                    onChange={(e) =>
                                      setPickFor(cardKey, s.strain_id, Math.max(0, parseInt(e.target.value || '0', 10)))
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="mom-action-card-foot">
                        <button
                          type="button"
                          className="mom-card-cta is-primary"
                          onClick={() => {
                            const totalsByStrain = c.strains.map((s) => ({
                              strain_id: s.strain_id,
                              strain_name: s.strain_name,
                              plants: picks[s.strain_id] ?? 2,
                            }));
                            const total = totalsByStrain.reduce((a, p) => a + p.plants, 0);
                            if (total === 0) return;
                            onHoldBack({
                              sourceRoomCode: c.sourceRoomCode,
                              sourcePrefix: c.sourcePrefix,
                              flipISO: c.flipISO,
                              strains: totalsByStrain,
                            });
                            setExpandedCardKey(null);
                          }}
                        >
                          Confirm hold-back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Replacements due */}
        <div className="mom-action-bucket">
          <div className="mom-bucket-stamp cap mono">
            <span className="strong">REPLACEMENTS DUE</span>
            <span className="mute">health or rotations exhausted</span>
            <span className="num">{replacements.length}</span>
          </div>
          {replacements.length === 0 ? (
            <div className="mom-empty">All moms within rotation budget and healthy.</div>
          ) : (
            replacements.map((r) => (
              <div key={r.mom.id} className="mom-action-card mom-replace-card">
                <div className="mom-action-card-head">
                  <div>
                    <div className="cap mono mom-action-card-title">
                      <span className="strong">{r.mom.strain_name}</span>
                      <span className="sep">·</span>
                      <span className="mute">{r.group.label}</span>
                    </div>
                    <div className="cap mute mom-action-card-sub">
                      {r.reason} · last cut {r.mom.last_cut_date ? fmtDateShort(r.mom.last_cut_date) : 'never'} · cuts {r.mom.cuts_taken_lifetime}/{r.mom.cuts_max_rotations}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mom-card-cta"
                    onClick={() => onRetireMom(r.group.group_prefix, r.mom.id)}
                  >
                    Retire mom
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New genetics intake */}
        <div className="mom-action-bucket">
          <div className="mom-bucket-stamp cap mono">
            <span className="strong">NEW GENETICS</span>
            <span className="mute">intake new strain</span>
          </div>
          <div className="mom-intake">
            <input
              type="text"
              className="mom-intake-input"
              placeholder="Strain name"
              value={intakeName}
              onChange={(e) => setIntakeName(e.target.value)}
            />
            <button
              type="button"
              className="mom-card-cta is-primary"
              disabled={intakeName.trim().length === 0}
              onClick={() => {
                onAddGenetics(intakeName.trim());
                setIntakeName('');
              }}
            >
              Log intake
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── DEMAND HORIZON ──────────────────────── */

interface DemandHorizonRow {
  strain_id: string;
  strain_name: string;
  per_month: number[]; // length 6, planned cuts demanded
  cuts_available_lifetime: number;
  cuts_per_session: number;
  contributors_per_month: Array<Array<{ source: string; plants: number }>>;
}

function DemandHorizon({ rows, monthLabels }: { rows: DemandHorizonRow[]; monthLabels: string[] }) {
  if (rows.length === 0) {
    return (
      <section className="mom-section">
        <header className="mom-section-header">
          <span className="serial">FIG. 03</span>
          <span className="sep">·</span>
          <span>Demand horizon</span>
        </header>
        <div className="mom-section-body">
          <div className="mom-empty">No planned cut demand in the next 6 months.</div>
        </div>
      </section>
    );
  }
  return (
    <section className="mom-section">
      <header className="mom-section-header">
        <span className="serial">FIG. 03</span>
        <span className="sep">·</span>
        <span>Demand horizon</span>
        <span className="cap mute" style={{ marginLeft: 'auto' }}>
          6 months forward · cuts demanded vs cuts available
        </span>
      </header>
      <div className="mom-section-body">
        <div className="mom-demand-table">
          <div className="mom-demand-row mom-demand-head cap mono">
            <span className="mom-demand-strain">STRAIN</span>
            {monthLabels.map((m) => (
              <span key={m} className="mom-demand-cell mom-demand-cell-head">{m}</span>
            ))}
            <span className="mom-demand-avail">CUTS AVAIL</span>
          </div>
          {rows.map((r) => (
            <div key={r.strain_id} className="mom-demand-row">
              <span className="mom-demand-strain" title={r.strain_name}>{r.strain_name}</span>
              {r.per_month.map((cuts, i) => {
                const ratio = r.cuts_available_lifetime === 0
                  ? (cuts > 0 ? Infinity : 0)
                  : cuts / r.cuts_available_lifetime;
                let tone = 'mom-demand-ok';
                if (cuts > 0 && ratio === Infinity) tone = 'mom-demand-bad';
                else if (cuts > 0 && ratio >= 0.4) tone = 'mom-demand-bad';
                else if (cuts > 0 && ratio >= 0.2) tone = 'mom-demand-warn';
                else if (cuts === 0) tone = 'mom-demand-empty';
                const contributors = r.contributors_per_month[i] ?? [];
                const tip = contributors.length === 0
                  ? `${monthLabels[i]} · 0 cuts demanded`
                  : `${monthLabels[i]} · ${cuts} cuts demanded\n` +
                    contributors.map((c) => `${c.source} · ${c.plants} plants`).join('\n');
                return (
                  <span
                    key={i}
                    className={`mom-demand-cell num ${tone}`}
                    title={tip}
                  >
                    {cuts === 0 ? '—' : cuts}
                  </span>
                );
              })}
              <span className="mom-demand-avail num">
                {r.cuts_available_lifetime}
                <span className="mom-demand-avail-sub cap mute">{r.cuts_per_session}/sesh</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mom-demand-legend cap mono mute">
          Tinted cells indicate strain demand approaching or exceeding lifetime cut budget. Loss rates remain context-only — never auto-applied.
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── MOM ROSTER ──────────────────────────── */

function MomRoster({
  groups,
  onRetireMom,
}: {
  groups: MotherBatchGroup[];
  onRetireMom: (groupPrefix: string, momId: string) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(groups[0]?.group_prefix ?? null);

  return (
    <section className="mom-section">
      <header className="mom-section-header">
        <span className="serial">FIG. 04</span>
        <span className="sep">·</span>
        <span>Mom roster</span>
        <span className="cap mute" style={{ marginLeft: 'auto' }}>
          {groups.length} MBG{groups.length === 1 ? '' : 's'} ·{' '}
          {groups.reduce((s, g) => s + g.moms.filter((m) => !m.retired).length, 0)} active moms
        </span>
      </header>
      <div className="mom-section-body">
        {groups.map((g) => {
          const open = openGroup === g.group_prefix;
          const active = g.moms.filter((m) => !m.retired);
          const declining = active.filter((m) => m.health === 'declining').length;
          const replace = active.filter((m) => m.health === 'needs_replacement').length;
          return (
            <div key={g.group_prefix} className={`mom-roster-mbg ${open ? 'is-open' : ''}`}>
              <button
                type="button"
                className="mom-roster-mbg-head"
                onClick={() => setOpenGroup(open ? null : g.group_prefix)}
                aria-expanded={open}
              >
                <span className="cap mono">
                  <span className="strong">MBG</span>
                  <span className="sep">·</span>
                  <span className="mom-mbg-prefix">{g.group_prefix}</span>
                  <span className="sep">·</span>
                  <span className="mute">{g.source_flower_room_code} source</span>
                </span>
                <span className="cap mute">
                  {active.length} moms ·{' '}
                  {declining > 0 ? <span className="mom-tone-warn">{declining} declining </span> : null}
                  {replace > 0 ? <span className="mom-tone-bad">{replace} replace</span> : null}
                  {declining === 0 && replace === 0 ? <span className="mom-tone-ok">all healthy</span> : null}
                </span>
                <span className="mom-roster-chev mono">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="mom-individual-list">
                  {g.moms.map((m) => {
                    const ageDays = daysFromToday(m.became_mom_date);
                    const ageAbs = Math.abs(ageDays);
                    const lastCut = m.last_cut_date ? `${Math.abs(daysFromToday(m.last_cut_date))}d ago` : 'never';
                    const remaining = Math.max(0, m.cuts_max_rotations - m.cuts_taken_lifetime);
                    const pct = Math.min(100, Math.round((m.cuts_taken_lifetime / m.cuts_max_rotations) * 100));
                    return (
                      <div key={m.id} className={`mom-individual ${m.retired ? 'is-retired' : ''}`}>
                        <span className="mom-individual-id cap mono">{m.id.split('-').slice(-1)[0]}</span>
                        <span className="mom-individual-strain">{m.strain_name}</span>
                        <span className={`mom-individual-health cap mono ${healthClass(m.health)}`}>
                          {healthLabel(m.health)}
                        </span>
                        <div className="mom-individual-cuts">
                          <div className="mom-individual-cuts-bar" aria-hidden>
                            <div className="mom-individual-cuts-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="cap mono mute">
                            {m.cuts_taken_lifetime}/{m.cuts_max_rotations} · {remaining} left
                          </span>
                        </div>
                        <span className="cap mute mom-individual-age">{ageAbs}d old · cut {lastCut}</span>
                        {!m.retired && (
                          <button
                            type="button"
                            className="mom-retire-link cap mono"
                            onClick={() => onRetireMom(g.group_prefix, m.id)}
                          >
                            retire
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────── CAPACITY CEILING ────────────────────── */

function CapacityCeiling({
  groups,
  capacity,
}: {
  groups: MotherBatchGroup[];
  capacity: number;
}) {
  const [open, setOpen] = useState(false);
  const activePlants = groups.reduce(
    (s, g) => s + g.moms.filter((m) => !m.retired).length,
    0
  );
  const utilization = capacity > 0 ? Math.round((activePlants / capacity) * 100) : 0;
  return (
    <section className={`mom-section mom-section-collapsible ${open ? 'is-open' : ''}`}>
      <button type="button" className="mom-section-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="serial">FIG. 05</span>
        <span className="sep">·</span>
        <span>Capacity ceiling</span>
        <span className="cap mute" style={{ marginLeft: 'auto' }}>
          {activePlants}/{capacity} ({utilization}%) · {open ? 'hide' : 'expand'}
        </span>
      </button>
      {open && (
        <div className="mom-section-body">
          <div className="mom-capacity-summary cap mute">
            MOM-01 currently holds {activePlants} active moms against {capacity} plant capacity. Forward shape responds to pending hold-backs and retirements as they're confirmed.
          </div>
          <div className="mom-capacity-bar" aria-label="Mom room utilization">
            <div className="mom-capacity-bar-fill" style={{ width: `${Math.min(100, utilization)}%` }} />
            <div className="mom-capacity-bar-label cap mono">{utilization}%</div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────── MAIN DRAWER ─────────────────────────── */

export function MomPlanningDrawer({
  open,
  room,
  batches,
  plannedByRoom,
  strainStats,
  motherBatchGroups,
  rooms,
  onClose,
  onHoldBack,
  onRetireMom,
  onAddGenetics,
}: MomPlanningDrawerProps) {
  const cycleConfig = useCycleConfig();
  const strainStatsById = useMemo(() => {
    const m = new Map<string, StrainCultivationStats>();
    for (const s of strainStats) m.set(s.strain_id, s);
    return m;
  }, [strainStats]);

  // ── Hold-back candidates: flower batches whose flower-segment start is
  // within 14 days of today (about-to-flip), plus planned cycles in the
  // same window. Group by source room + cohort prefix.
  const holdBackCandidates = useMemo(() => {
    const today = todayISO();
    const horizonEnd = offsetISO(today, 14);
    const candByKey = new Map<string, {
      sourceRoomCode: string;
      sourcePrefix: string;
      sourceCycleId: string;
      flipISO: string;
      daysOut: number;
      strains: Array<{ strain_id: string; strain_name: string; plant_count: number }>;
    }>();

    const roomById = new Map(rooms.map((r) => [r.room_id, r]));

    for (const b of batches) {
      const fs = b.segments.find((s) => s.stage === 'flower');
      if (!fs) continue;
      // Must not have flipped already (start in future) and within horizon.
      if (fs.start <= today || fs.start > horizonEnd) continue;
      const sourceRoom = roomById.get(fs.room_id);
      if (!sourceRoom) continue;
      const prefix = b.batch_code.split(' ')[0]?.split('-')[0] ?? b.batch_code.slice(0, 6);
      const key = `${sourceRoom.room_code}-${prefix}`;
      const existing = candByKey.get(key);
      if (existing) {
        existing.strains.push({
          strain_id: b.strain_id,
          strain_name: b.strain_name,
          plant_count: fs.plant_count,
        });
      } else {
        candByKey.set(key, {
          sourceRoomCode: sourceRoom.room_code,
          sourcePrefix: prefix,
          sourceCycleId: `cycle-${prefix}-${sourceRoom.room_code}`,
          flipISO: fs.start,
          daysOut: daysFromToday(fs.start),
          strains: [{ strain_id: b.strain_id, strain_name: b.strain_name, plant_count: fs.plant_count }],
        });
      }
    }

    for (const [roomId, planned] of Object.entries(plannedByRoom)) {
      const sourceRoom = roomById.get(roomId);
      if (!sourceRoom || sourceRoom.room_type !== 'flower') continue;
      for (const p of planned) {
        if (p.flower_start_date <= today || p.flower_start_date > horizonEnd) continue;
        const prefix = p.id.split('-').slice(-2)[0]?.slice(0, 6) ?? p.id.slice(0, 6);
        const key = `${sourceRoom.room_code}-${prefix}-planned`;
        const existing = candByKey.get(key);
        if (existing) {
          existing.strains.push({
            strain_id: p.strain_id,
            strain_name: p.strain_name,
            plant_count: p.planned_plant_count,
          });
        } else {
          candByKey.set(key, {
            sourceRoomCode: sourceRoom.room_code,
            sourcePrefix: prefix,
            sourceCycleId: p.id,
            flipISO: p.flower_start_date,
            daysOut: daysFromToday(p.flower_start_date),
            strains: [{ strain_id: p.strain_id, strain_name: p.strain_name, plant_count: p.planned_plant_count }],
          });
        }
      }
    }

    // Filter out candidates whose source has already been held back: an MBG
    // with matching group_prefix exists in the roster, so the operator's
    // already captured this hold-back. Prevents the "did the action take?"
    // confusion when the candidate card persists after confirm.
    const existingPrefixes = new Set(motherBatchGroups.map((g) => g.group_prefix));
    return Array.from(candByKey.values())
      .filter((c) => !existingPrefixes.has(c.sourcePrefix))
      .sort((a, b) => a.flipISO.localeCompare(b.flipISO));
  }, [batches, plannedByRoom, rooms, motherBatchGroups]);

  // ── Replacements due: moms with health=needs_replacement OR exhausted rotations.
  const replacements = useMemo(() => {
    const out: Array<{ group: MotherBatchGroup; mom: MotherIndividual; reason: string }> = [];
    for (const g of motherBatchGroups) {
      for (const m of g.moms) {
        if (m.retired) continue;
        if (m.health === 'needs_replacement') {
          out.push({ group: g, mom: m, reason: 'Audit flagged needs_replacement' });
        } else if (m.cuts_taken_lifetime >= m.cuts_max_rotations) {
          out.push({ group: g, mom: m, reason: 'Lifetime cut budget exhausted' });
        }
      }
    }
    return out;
  }, [motherBatchGroups]);

  // ── Demand horizon: 6 months forward from today.
  const demandHorizon = useMemo<{ rows: DemandHorizonRow[]; labels: string[] }>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const labels: string[] = [];
    const monthKeys: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      labels.push(MONTH_LABELS[d.getMonth()]);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const cutOffsetDays = cycleConfig.clone_days + cycleConfig.veg_days;
    type Demand = {
      cuts: number;
      contributors: Array<{ source: string; plants: number }>;
    };
    const byStrain = new Map<string, { strain_name: string; months: Demand[] }>();

    const ensure = (sid: string, sname: string) => {
      let row = byStrain.get(sid);
      if (!row) {
        row = {
          strain_name: sname,
          months: monthKeys.map(() => ({ cuts: 0, contributors: [] })),
        };
        byStrain.set(sid, row);
      }
      return row;
    };

    // From planned cycles.
    for (const planned of Object.values(plannedByRoom)) {
      for (const p of planned) {
        const cutISO = offsetISO(p.flower_start_date, -cutOffsetDays);
        const mk = monthKey(cutISO);
        const idx = monthKeys.indexOf(mk);
        if (idx === -1) continue;
        const row = ensure(p.strain_id, p.strain_name);
        row.months[idx].cuts += p.planned_plant_count;
        row.months[idx].contributors.push({
          source: `${p.flower_start_date.slice(5)} · ${p.strain_name}`,
          plants: p.planned_plant_count,
        });
      }
    }

    // From in-flight batches that still have a forward flower segment whose start
    // is in the horizon (lookahead for already-committed batches).
    const today2 = todayISO();
    const horizon6mo = offsetISO(today2, 180);
    for (const b of batches) {
      const fs = b.segments.find((s) => s.stage === 'flower');
      if (!fs) continue;
      if (fs.start <= today2) continue;
      if (fs.start > horizon6mo) continue;
      const cutISO = offsetISO(fs.start, -cutOffsetDays);
      const mk = monthKey(cutISO);
      const idx = monthKeys.indexOf(mk);
      if (idx === -1) continue;
      const row = ensure(b.strain_id, b.strain_name);
      row.months[idx].cuts += fs.plant_count;
      row.months[idx].contributors.push({
        source: `${b.batch_code.split(' ')[0]} · ${b.strain_name}`,
        plants: fs.plant_count,
      });
    }

    // Cuts available per strain across all non-retired moms.
    const momsByStrain = new Map<string, MotherIndividual[]>();
    for (const g of motherBatchGroups) {
      for (const m of g.moms) {
        if (m.retired) continue;
        const list = momsByStrain.get(m.strain_id) ?? [];
        list.push(m);
        momsByStrain.set(m.strain_id, list);
      }
    }

    const rows: DemandHorizonRow[] = [];
    for (const [sid, row] of byStrain.entries()) {
      const stat = strainStatsById.get(sid);
      const cutsPerSession = stat?.cuts_per_session_per_mom ?? 60;
      const moms = momsByStrain.get(sid) ?? [];
      const cutsAvailable = moms.reduce(
        (s, m) => s + Math.max(0, m.cuts_max_rotations - m.cuts_taken_lifetime) * cutsPerSession,
        0
      );
      rows.push({
        strain_id: sid,
        strain_name: row.strain_name,
        per_month: row.months.map((m) => m.cuts),
        contributors_per_month: row.months.map((m) => m.contributors),
        cuts_available_lifetime: cutsAvailable,
        cuts_per_session: cutsPerSession,
      });
    }

    rows.sort((a, b) => {
      const aTotal = a.per_month.reduce((s, n) => s + n, 0);
      const bTotal = b.per_month.reduce((s, n) => s + n, 0);
      return bTotal - aTotal;
    });

    return { rows, labels };
  }, [batches, plannedByRoom, motherBatchGroups, strainStatsById, cycleConfig]);

  if (!open || !room) return null;

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden />
      <aside
        className="drawer mom-planning-drawer"
        role="dialog"
        aria-label="Mom planning surface"
      >
        <div className="drawer-toolbar">
          <span className="cap mute">Mom planning · {room.room_code}</span>
          <div className="drawer-toolbar-actions">
            <button
              type="button"
              className="drawer-close"
              onClick={onClose}
              aria-label="Close mom planning surface"
            >
              Close ×
            </button>
          </div>
        </div>
        <div className="drawer-body mom-drawer-body">
          <div className="mom-drawer-header">
            <div className="mom-drawer-title">
              <span className="serial">FIG. 01</span>
              <span className="sep">·</span>
              <span>{room.room_name}</span>
              <span className="sep">·</span>
              <span className="strong">{room.total_plants} active mom{room.total_plants === 1 ? '' : 's'}</span>
              <span className="sep">·</span>
              <span className="mute">{room.strain_count} strain{room.strain_count === 1 ? '' : 's'} in library</span>
            </div>
            <div className="cap mute mom-drawer-sub">
              Upstream of Plan a Batch Group. Generates Mother Batch Groups; the form consumes them.
            </div>
          </div>

          <ActionQueue
            holdBackCandidates={holdBackCandidates}
            replacements={replacements}
            onHoldBack={(c) => {
              const sourceMatch = motherBatchGroups.find((g) => g.group_prefix === c.sourcePrefix);
              if (sourceMatch) {
                onHoldBack(sourceMatch);
                return;
              }
              const synth: MotherBatchGroup = {
                group_prefix: c.sourcePrefix,
                room_code: room.room_code,
                label: `MBG · ${c.sourcePrefix} (${c.sourceRoomCode} source)`,
                source_flower_room_code: c.sourceRoomCode,
                cut_date: offsetISO(c.flipISO, -(cycleConfig.clone_days + cycleConfig.veg_days)),
                became_moms_date: c.flipISO,
                moms: c.strains.flatMap((s) =>
                  Array.from({ length: s.plants }).map((_, i) => ({
                    id: `mom-${c.sourcePrefix}-${s.strain_id}-${String.fromCharCode(65 + i)}`,
                    strain_id: s.strain_id,
                    strain_name: s.strain_name,
                    planted_date: offsetISO(c.flipISO, -(cycleConfig.clone_days + cycleConfig.veg_days)),
                    became_mom_date: c.flipISO,
                    last_cut_date: null,
                    cuts_taken_lifetime: 0,
                    cuts_max_rotations: 4,
                    health: 'healthy' as MotherHealth,
                    retired: false,
                  }))
                ),
              };
              onHoldBack(synth);
            }}
            onRetireMom={onRetireMom}
            onAddGenetics={onAddGenetics}
          />

          <DemandHorizon rows={demandHorizon.rows} monthLabels={demandHorizon.labels} />

          <MomRoster groups={motherBatchGroups} onRetireMom={onRetireMom} />

          <CapacityCeiling
            groups={motherBatchGroups}
            capacity={room.capacity_plants ?? 0}
          />
        </div>
      </aside>
    </>
  );
}

export default MomPlanningDrawer;
