import { ChevronRight } from 'lucide-react';
import type { StrainPipelineEntry, HealthStatus, GradeCode, SortMode } from '../../hooks/useSalesPipeline';
import type { BatchDetailRow } from '../../services/salesPipeline.service';
import { formatGrams, formatCurrency } from './pipelineConstants';
import { HealthBadge, GradeBadge } from './PipelineBadges';
import { MicroBar, MiniPipelineBar, SupplyDemandBar } from './PipelineMicroBars';
import { PipelineFilterBar } from './PipelineFilterBar';
import { ExpandedStrainDetail } from './ExpandedStrainDetail';

interface PipelineStrainTableProps {
  strains: StrainPipelineEntry[];
  healthFilter: HealthStatus | 'all';
  setHealthFilter: (v: HealthStatus | 'all') => void;
  gradeFilter: GradeCode | 'all';
  setGradeFilter: (v: GradeCode | 'all') => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
  expandedStrain: string | null;
  onToggleExpand: (strain: string) => void;
  batchDetails: BatchDetailRow[];
  batchDetailsLoading: boolean;
}

export function PipelineStrainTable({
  strains,
  healthFilter, setHealthFilter,
  gradeFilter, setGradeFilter,
  sortMode, setSortMode,
  expandedStrain, onToggleExpand,
  batchDetails, batchDetailsLoading,
}: PipelineStrainTableProps) {
  return (
    <div className="rounded-xl border border-cult-medium-gray/40 overflow-hidden bg-cult-black">
      <div className="p-3 pb-2 border-b border-cult-medium-gray/20">
        <PipelineFilterBar
          healthFilter={healthFilter}
          setHealthFilter={setHealthFilter}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
        />
      </div>

      <div className="hidden lg:grid items-center px-3 py-2 border-b border-cult-medium-gray/15 text-[9px] font-bold text-neutral-600 tracking-[0.08em]"
        style={{ gridTemplateColumns: '1.8fr 0.5fr 0.7fr 0.7fr 0.7fr 0.6fr 0.5fr' }}
      >
        <span>STRAIN</span>
        <span>GRADE</span>
        <span>SELLABLE</span>
        <span>PIPELINE</span>
        <span>DEMAND</span>
        <span>HEALTH</span>
        <span>SUPPLY</span>
      </div>

      {strains.map(s => {
        const isExpanded = expandedStrain === s.strain;
        return (
          <div key={s.strain}>
            <div
              className="grid items-center px-3 py-2.5 cursor-pointer transition-colors duration-150 border-b border-cult-medium-gray/10 hover:bg-neutral-900/50"
              style={{ gridTemplateColumns: '1.8fr 0.5fr 0.7fr 0.7fr 0.7fr 0.6fr 0.5fr' }}
              onClick={() => onToggleExpand(s.strain)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight className={`w-3 h-3 text-neutral-600 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                <span className="text-[13px] font-bold text-neutral-200 truncate">{s.strain}</span>
              </div>

              <div className="hidden lg:block">
                <GradeBadge grade={s.primaryGrade} />
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <span className="text-[12px] font-semibold text-neutral-300 tabular-nums">
                  {formatGrams(s.totalSellableGrams)}g
                </span>
                <MicroBar value={s.totalSellableGrams} max={5000} />
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <span className="text-[12px] font-semibold text-neutral-500 tabular-nums">
                  {formatGrams(s.pipelineGrams)}g
                </span>
                <MiniPipelineBar stages={s.stages} />
              </div>

              <div className="hidden lg:block">
                <div className="text-[12px] font-bold text-neutral-300 tabular-nums">{formatCurrency(s.demandRevenue)}</div>
                <div className="text-[9px] text-neutral-600">{s.demandOrders} orders</div>
              </div>

              <div className="hidden lg:block">
                <HealthBadge status={s.supplyHealth} />
              </div>

              <div className="hidden lg:block">
                <SupplyDemandBar
                  supply={s.totalSellableGrams}
                  demand={s.demandUnits}
                  health={s.supplyHealth}
                />
              </div>

              <div className="flex lg:hidden items-center gap-2 col-span-6 mt-1">
                <GradeBadge grade={s.primaryGrade} />
                <HealthBadge status={s.supplyHealth} />
                <span className="text-[11px] text-neutral-400 tabular-nums ml-auto">{formatCurrency(s.demandRevenue)}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="animate-fade-in overflow-hidden">
                <ExpandedStrainDetail
                  strain={s}
                  batches={batchDetails}
                  batchesLoading={batchDetailsLoading}
                />
              </div>
            )}
          </div>
        );
      })}

      {strains.length === 0 && (
        <div className="text-center py-8 text-[12px] text-neutral-600">No strains match current filters</div>
      )}
    </div>
  );
}
