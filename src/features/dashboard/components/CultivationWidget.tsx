import { useEffect, useState } from 'react';
import { Sprout, Scissors, Scale, ArrowRight, AlertTriangle } from 'lucide-react';
import { cultivationService } from '@/features/cultivation/services';
import { isValidStrainAbbreviation } from '@/features/cultivation/utils';
import type { HarvestSession, BinningSession } from '@/features/cultivation/types';

interface CultivationWidgetProps {
  onViewChange: (view: string) => void;
}

interface CultivationSummary {
  activeGroups: number;
  totalPlants: number;
  cloneCount: number;
  vegCount: number;
  flowerCount: number;
  activeHarvests: HarvestSession[];
  pendingBinning: number;
  activeBinning: BinningSession[];
  missingAbbrevStrains: string[];
}

const STAGE_STYLES: Record<string, { bar: string; text: string }> = {
  clone: { bar: 'bg-sky-500', text: 'text-sky-400' },
  veg: { bar: 'bg-green-500', text: 'text-green-400' },
  flower: { bar: 'bg-rose-500', text: 'text-rose-400' },
};

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${Math.round(grams)} g`;
}

export function CultivationWidget({ onViewChange }: CultivationWidgetProps) {
  const [summary, setSummary] = useState<CultivationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [groups, harvests, binningSessions, unbinnedHarvests] = await Promise.all([
          cultivationService.listPlantGroups({ stage: 'active' }),
          cultivationService.listHarvestSessions({ status: 'active' }),
          cultivationService.listBinningSessions({ status: 'active' }),
          cultivationService.listUnbinnedHarvestSessions(),
        ]);

        if (cancelled) return;

        const missingAbbrevStrains = Array.from(
          new Set(
            groups
              .filter((g) => !isValidStrainAbbreviation(g.strains?.abbreviation))
              .map((g) => g.strains?.name ?? 'Unknown')
          )
        );

        setSummary({
          activeGroups: groups.length,
          totalPlants: groups.reduce((s, g) => s + g.plant_count, 0),
          cloneCount: groups.filter((g) => g.growth_stage === 'clone').length,
          vegCount: groups.filter((g) => g.growth_stage === 'veg').length,
          flowerCount: groups.filter((g) => g.growth_stage === 'flower').length,
          activeHarvests: harvests,
          pendingBinning: unbinnedHarvests.length,
          activeBinning: binningSessions,
          missingAbbrevStrains,
        });
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Sprout className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">Cultivation</h2>
        </div>
        <div className="text-xs text-cult-medium-gray py-4">Loading cultivation data…</div>
      </div>
    );
  }

  if (!summary) return null;

  const totalGroupsForBar = summary.cloneCount + summary.vegCount + summary.flowerCount || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="w-5 h-5 text-green-400" />
          <div>
            <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">Cultivation</h2>
            <p className="text-xs text-cult-light-gray mt-0.5">Active plant groups, harvests, and drying runs</p>
          </div>
        </div>
        <button
          onClick={() => onViewChange('cultivation-dashboard')}
          className="flex items-center gap-1.5 text-xs text-cult-light-gray hover:text-cult-white transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {summary.missingAbbrevStrains.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-950/50 border border-amber-800 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">Harvest blocked: </span>
            {summary.missingAbbrevStrains.join(', ')} — add 3-letter abbreviations in Products &gt; Strains.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cult-black border border-cult-dark-gray p-3">
          <div className="text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Active Groups</div>
          <div className="text-2xl font-bold text-cult-white">{summary.activeGroups}</div>
          <div className="text-xs text-cult-medium-gray mt-0.5">{summary.totalPlants.toLocaleString()} plants</div>
        </div>
        <div className="bg-cult-black border border-cult-dark-gray p-3">
          <div className="text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Active Harvests</div>
          <div className={`text-2xl font-bold ${summary.activeHarvests.length > 0 ? 'text-amber-400' : 'text-cult-white'}`}>
            {summary.activeHarvests.length}
          </div>
          <div className="text-xs text-cult-medium-gray mt-0.5">in progress</div>
        </div>
        <div className="bg-cult-black border border-cult-dark-gray p-3">
          <div className="text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Pending Binning</div>
          <div className={`text-2xl font-bold ${summary.pendingBinning > 0 ? 'text-sky-400' : 'text-cult-white'}`}>
            {summary.pendingBinning}
          </div>
          <div className="text-xs text-cult-medium-gray mt-0.5">awaiting dry weight</div>
        </div>
      </div>

      {summary.activeGroups > 0 && (
        <div>
          <div className="text-xs text-cult-medium-gray uppercase tracking-wider mb-2">Stage Distribution</div>
          <div className="flex h-2 rounded-full overflow-hidden bg-cult-dark-gray gap-px">
            {(['clone', 'veg', 'flower'] as const).map((stage) => {
              const count = stage === 'clone' ? summary.cloneCount : stage === 'veg' ? summary.vegCount : summary.flowerCount;
              const pct = (count / totalGroupsForBar) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={stage}
                  className={STAGE_STYLES[stage].bar}
                  style={{ width: `${pct}%` }}
                  title={`${stage}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2">
            {(['clone', 'veg', 'flower'] as const).map((stage) => {
              const count = stage === 'clone' ? summary.cloneCount : stage === 'veg' ? summary.vegCount : summary.flowerCount;
              return (
                <div key={stage} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${STAGE_STYLES[stage].bar}`} />
                  <span className={`text-xs capitalize ${STAGE_STYLES[stage].text}`}>{stage}</span>
                  <span className="text-xs text-cult-medium-gray">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {summary.activeHarvests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-cult-medium-gray uppercase tracking-wider">
              <Scissors className="w-3.5 h-3.5" />
              Active Harvests
            </div>
            <button
              onClick={() => onViewChange('cultivation-harvest')}
              className="text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              Manage →
            </button>
          </div>
          <div className="space-y-1">
            {summary.activeHarvests.slice(0, 3).map((h) => (
              <div key={h.id} className="flex items-center justify-between border border-cult-dark-gray bg-cult-black px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-cult-light-gray">{h.plant_groups?.group_number ?? '—'}</span>
                  <span className="text-xs text-cult-white truncate">{h.plant_groups?.strains?.name ?? 'Unknown'}</span>
                </div>
                <span className="text-xs text-amber-400 font-mono flex-shrink-0">
                  {formatWeight(h.wet_weight_grams)}
                </span>
              </div>
            ))}
            {summary.activeHarvests.length > 3 && (
              <p className="text-xs text-cult-medium-gray text-center py-1">
                +{summary.activeHarvests.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {summary.pendingBinning > 0 && (
        <div className="flex items-center justify-between border border-sky-900 bg-sky-950/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-sky-400" />
            <span className="text-sm text-sky-300">
              {summary.pendingBinning} harvest{summary.pendingBinning !== 1 ? 's' : ''} ready to bin
            </span>
          </div>
          <button
            onClick={() => onViewChange('cultivation-binning')}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium uppercase tracking-wider"
          >
            Start Binning
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {summary.activeGroups === 0 && summary.activeHarvests.length === 0 && summary.pendingBinning === 0 && (
        <div className="border border-dashed border-cult-medium-gray p-6 text-center">
          <Sprout className="w-8 h-8 text-cult-dark-gray mx-auto mb-2" />
          <p className="text-sm text-cult-medium-gray">No active cultivation activity</p>
          <button
            onClick={() => onViewChange('cultivation-dashboard')}
            className="mt-2 text-xs text-cult-light-gray hover:text-cult-white transition-colors"
          >
            Go to Cultivation →
          </button>
        </div>
      )}
    </div>
  );
}
