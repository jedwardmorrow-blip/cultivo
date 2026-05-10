import type { HomeData } from '../../hooks/useHomeData';
import { useFloorPlanData } from '@/features/cultivation/components/command/floor-plan/useFloorPlanData';
import { fmtLbs, fmtCount } from './format';

/**
 * V4 Bureau Tier 2 instrument · stage-flow ribbon (6 stages).
 *
 * A horizontal across-the-page ribbon showing batch flow through the six
 * canonical stages. Bridges to the COO Pipeline canonical surface (per
 * cultivo_persona_coo handoff spec lines 127-147) without building it
 * yet — Pipeline's own canvas is queued for Claude Design.
 *
 * Six stages (left to right): Clone, Veg, Flower, Dry/Cure, Package,
 * Allocated. Each cell shows a primary numeric (Big Shoulders) + unit
 * (mono caps) + a secondary tag.
 *
 * Data sources, honest about what's available:
 *
 *   - Clone, Veg, Flower: counts derived from useFloorPlanData rooms
 *     reduced by dominant_stage. Unit is "plants" (not lbs). Empty rooms
 *     are excluded.
 *   - Flower secondary line: thisWeekHarvestLbs from useHomeData (the
 *     projected harvest signal that bridges live → post-harvest).
 *   - Dry/Cure: binnedLbs + buckedLbs + trimmedLbs combined (post-harvest
 *     material flowing through bucking, drying, trim, cure).
 *   - Package: packagedLbs from useHomeData.conversion.
 *   - Allocated: readyLbs (sellable) plus soldNotDeliveredLbs (committed
 *     to orders, not yet delivered).
 *
 * When Pipeline ships as its canonical surface, this ribbon becomes
 * redundant on /dashboard and gets deprecated. Until then, this is the
 * COO's pipeline-glance from the executive rollup home.
 */
interface Props {
  data: HomeData;
}

const PLANT_STAGES = ['clone', 'veg', 'flower'] as const;
type PlantStage = (typeof PLANT_STAGES)[number];

export function StageFlowRibbon({ data }: Props) {
  const { rooms } = useFloorPlanData();

  // Reduce live rooms by dominant_stage to get plant counts for the
  // first three stages.
  const plantCounts: Record<PlantStage, number> = { clone: 0, veg: 0, flower: 0 };
  for (const r of rooms) {
    const stage = r.dominant_stage;
    if (stage && (PLANT_STAGES as readonly string[]).includes(stage)) {
      plantCounts[stage as PlantStage] += r.total_plants ?? 0;
    }
  }

  // Dry/Cure aggregates the three pre-package post-harvest weights.
  const dryCureLbs =
    data.conversion.binnedLbs + data.conversion.buckedLbs + data.conversion.trimmedLbs;

  const allocatedLbs = data.coverage.readyLbs + data.coverage.soldNotDeliveredLbs;

  const stages = [
    {
      fig: '01',
      name: 'Clone',
      lead: fmtCount(plantCounts.clone),
      unit: 'PLANTS',
      secondary: plantCounts.clone > 0 ? 'in cycle' : 'no live rooms',
      pending: plantCounts.clone === 0,
    },
    {
      fig: '02',
      name: 'Veg',
      lead: fmtCount(plantCounts.veg),
      unit: 'PLANTS',
      secondary: plantCounts.veg > 0 ? 'in cycle' : 'no live rooms',
      pending: plantCounts.veg === 0,
    },
    {
      fig: '03',
      name: 'Flower',
      lead: fmtCount(plantCounts.flower),
      unit: 'PLANTS',
      secondary:
        data.pipeline.thisWeekHarvestLbs > 0
          ? `${fmtLbs(data.pipeline.thisWeekHarvestLbs)} due this week`
          : plantCounts.flower > 0
          ? 'in cycle'
          : 'no live rooms',
      pending: plantCounts.flower === 0,
    },
    {
      fig: '04',
      name: 'Dry / Cure',
      lead: fmtLbs(dryCureLbs),
      unit: '',
      secondary:
        dryCureLbs > 0
          ? `${fmtLbs(data.conversion.binnedLbs)} bin · ${fmtLbs(data.conversion.buckedLbs)} buck · ${fmtLbs(data.conversion.trimmedLbs)} trim`
          : 'no post-harvest material',
      pending: dryCureLbs === 0,
    },
    {
      fig: '05',
      name: 'Package',
      lead: fmtLbs(data.conversion.packagedLbs),
      unit: '',
      secondary:
        data.conversion.packagedLbs > 0 ? 'jarred for retail' : 'nothing packaged',
      pending: data.conversion.packagedLbs === 0,
    },
    {
      fig: '06',
      name: 'Allocated',
      lead: fmtLbs(allocatedLbs),
      unit: '',
      secondary:
        allocatedLbs > 0
          ? `${fmtLbs(data.coverage.readyLbs)} ready · ${fmtLbs(data.coverage.soldNotDeliveredLbs)} committed`
          : 'no allocation',
      pending: allocatedLbs === 0,
    },
  ];

  return (
    <div className="bv4-stage-ribbon" role="group" aria-label="Stage flow ribbon">
      {stages.map((s) => (
        <div
          key={s.fig}
          className={`bv4-stage-cell${s.pending ? ' is-pending' : ''}`}
        >
          <div className="stage-fig">
            <span className="num">FIG.{s.fig}</span>
            <span className="stage-name">{s.name}</span>
          </div>
          <div className="stage-value">
            <span className="lead">{s.lead}</span>
            {s.unit && <span className="unit">{s.unit}</span>}
          </div>
          <div className="stage-secondary">{s.secondary}</div>
        </div>
      ))}
    </div>
  );
}
