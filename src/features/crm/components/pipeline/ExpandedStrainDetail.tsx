import { Loader2 } from 'lucide-react';
import type { StrainPipelineEntry } from '../../hooks/useSalesPipeline';
import type { BatchDetailRow } from '../../services/salesPipeline.service';
import { formatGrams, formatCurrency, STAGE_COLORS, STAGE_TW } from './pipelineConstants';
import { GradeBadge } from './PipelineBadges';
import type { GradeCode } from '@/types';

interface ExpandedStrainDetailProps {
  strain: StrainPipelineEntry;
  batches: BatchDetailRow[];
  batchesLoading: boolean;
}

function MetricBox({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="rounded-lg p-2.5 border border-cult-medium-gray/30 bg-cult-black">
      <div className="text-xs font-bold text-neutral-500 tracking-[0.08em] mb-1">{label}</div>
      <div className={`text-base font-extrabold tabular-nums ${colorClass}`}>{value}</div>
    </div>
  );
}

export function ExpandedStrainDetail({ strain: s, batches, batchesLoading }: ExpandedStrainDetailProps) {
  const totalSellable = s.sellableFlowerGrams + s.sellableSmallsGrams;
  const totalDemandGrams = s.demandUnits * 3.5;
  const maxBar = Math.max(totalSellable, totalDemandGrams, 1);

  const stageEntries = Object.entries(s.stages).filter(([k]) => k !== 'byproduct') as [string, number][];
  const stageTotal = stageEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="px-4 py-3 border-b border-cult-medium-gray/20 bg-[#090909]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MetricBox label="SELLABLE FLOWER" value={formatGrams(s.sellableFlowerGrams) + 'g'} colorClass="text-cult-success" />
        <MetricBox label="SELLABLE SMALLS" value={formatGrams(s.sellableSmallsGrams) + 'g'} colorClass="text-cult-success" />
        <MetricBox label="PACKAGED UNITS" value={s.packagedUnits.toLocaleString()} colorClass="text-cult-success/60" />
        <MetricBox label="PIPELINE" value={formatGrams(s.pipelineGrams) + 'g'} colorClass="text-cult-info" />
      </div>

      <div className="mb-3">
        <div className="text-xs font-bold text-neutral-600 tracking-[0.08em] mb-1.5">PIPELINE STAGES</div>
        {stageTotal > 0 && (
          <div className="flex gap-[3px] h-[10px] rounded-md overflow-hidden mb-1.5">
            {stageEntries.map(([k, v]) => {
              const pct = (v / stageTotal) * 100;
              return pct > 0 ? (
                <div key={k} className="h-full rounded-sm" style={{ width: `${pct}%`, background: STAGE_COLORS[k] }} />
              ) : null;
            })}
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          {stageEntries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="w-[5px] h-[5px] rounded-full" style={{ background: STAGE_COLORS[k] }} />
              <span className="text-xs text-neutral-500 capitalize">{k}</span>
              <span className={`text-xs font-bold ${STAGE_TW[k]?.text || 'text-neutral-400'} tabular-nums`}>
                {k === 'packaged' ? v.toLocaleString() + 'u' : formatGrams(v) + 'g'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-bold text-neutral-600 tracking-[0.08em] mb-1.5">SUPPLY vs DEMAND</div>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-500">Supply</span>
              <span className="font-bold text-cult-success tabular-nums">{formatGrams(totalSellable)}g</span>
            </div>
            <div className="h-[6px] rounded-full overflow-hidden bg-neutral-800/50">
              <div className="h-full rounded-full bg-cult-success" style={{ width: `${(totalSellable / maxBar) * 100}%` }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-500">Demand</span>
              <span className="font-bold text-cult-danger tabular-nums">{s.demandUnits.toLocaleString()} units</span>
            </div>
            <div className="h-[6px] rounded-full overflow-hidden bg-neutral-800/50">
              <div className="h-full rounded-full bg-cult-danger" style={{ width: `${(totalDemandGrams / maxBar) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {batchesLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
          <span className="text-xs text-neutral-500">Loading batches...</span>
        </div>
      ) : batches.length > 0 ? (
        <div>
          <div className="text-xs font-bold text-neutral-600 tracking-[0.08em] mb-1.5">BATCHES ({batches.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {batches.map(b => {
              const ageDays = b.harvest_date
                ? Math.floor((Date.now() - new Date(b.harvest_date).getTime()) / 86400000)
                : Math.floor((Date.now() - new Date(b.created_at).getTime()) / 86400000);

              return (
                <div key={b.id} className="rounded-lg p-2.5 border border-cult-medium-gray/20 bg-cult-black">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-neutral-300 font-mono">{b.batch_number}</span>
                    <span className="text-xs px-1.5 py-px rounded font-semibold bg-neutral-800/60 text-neutral-500 border border-neutral-700/50">
                      {b.lifecycle_state}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs flex-wrap">
                    {b.grade_code && b.grade_code !== 'UNDEFINED' && (
                      <GradeBadge grade={b.grade_code as GradeCode} />
                    )}
                    {b.thc_percentage != null && (
                      <span className="text-cult-success font-semibold">THC {b.thc_percentage}%</span>
                    )}
                    <span className="text-neutral-600">{ageDays}d old</span>
                    {b.harvest_date && (
                      <span className="text-neutral-600">
                        {new Date(b.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
