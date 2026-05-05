import { CheckCircle2, Clock, Loader2, ChevronRight, Gift } from 'lucide-react';
import type { OrderLineItem, DispatchItemStatus } from '@/features/delivery/hooks/useOrderFulfillment';
import { COA_STATUS_CONFIG, GRADE_COLOR_MAP } from '@/features/delivery/hooks/useOrderFulfillment';

interface FulfillmentLineItemProps {
  item: OrderLineItem;
  dispatchItems: DispatchItemStatus[];
  onTap: () => void;
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

export function FulfillmentLineItem({ item, dispatchItems, onTap }: FulfillmentLineItemProps) {
  const isFullyAssigned = item.units_remaining === 0;
  const fillPct = item.quantity > 0 ? Math.round((item.units_assigned / item.quantity) * 100) : 0;
  const activeDispatches = dispatchItems.filter((d) => d.order_item_id === item.order_item_id);
  const inProgress = activeDispatches.filter((d) => d.status === 'in_progress').length;
  const queued = activeDispatches.filter((d) => d.status === 'pending').length;
  const weightNeeded =
    item.weight_per_unit_g && item.units_remaining > 0
      ? formatG(item.weight_per_unit_g * item.units_remaining)
      : null;

  return (
    <button
      type="button"
      onClick={!isFullyAssigned ? onTap : undefined}
      disabled={isFullyAssigned}
      className={`w-full text-left px-3 py-2.5 rounded-cult border transition-all duration-150
        ${isFullyAssigned
          ? 'border-emerald-500/15 bg-emerald-500/[0.03] cursor-default'
          : 'border-cult-border-subtle bg-cult-surface-inset hover:bg-cult-surface-subtle hover:border-cult-border-active cursor-pointer'
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Strain + format */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white">{item.strain_name}</span>
            <span className="text-[10px] text-white/40">{item.format_label}</span>
            {item.batch_number && (
              <span className="text-[9px] font-mono text-white/25 bg-cult-surface-inset px-1 py-0.5 rounded">
                {item.batch_number}
              </span>
            )}
            {item.is_sample && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/20">
                <Gift className="w-2.5 h-2.5" />
                Sample
              </span>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {isFullyAssigned ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Assigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-2.5 h-2.5" />
                Needs Work
              </span>
            )}
            {item.coa_status && COA_STATUS_CONFIG[item.coa_status] && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${COA_STATUS_CONFIG[item.coa_status].color}`}>
                {COA_STATUS_CONFIG[item.coa_status].label}
              </span>
            )}
            {item.batch_grade_code && item.batch_grade_code !== 'UNDEFINED' && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${GRADE_COLOR_MAP[item.batch_grade_code] || GRADE_COLOR_MAP.UNDEFINED}`}>
                {item.batch_grade_label || item.batch_grade_code}
              </span>
            )}
            {inProgress > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                {inProgress} processing
              </span>
            )}
            {queued > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {queued} queued
              </span>
            )}
          </div>
        </div>

        {/* Right: weight needed + units + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {weightNeeded && !isFullyAssigned && (
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-semibold text-white/50 tabular-nums">{weightNeeded}</div>
              <div className="text-[9px] text-white/25">needed</div>
            </div>
          )}
          <div className="text-right min-w-[48px]">
            <div className="text-xs font-bold text-white tabular-nums">
              {item.units_assigned} <span className="text-white/30 text-[10px] font-normal">/ {item.quantity}</span>
            </div>
          </div>
          {!isFullyAssigned && (
            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-0.5 rounded-full bg-cult-surface-raised overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFullyAssigned ? 'bg-emerald-400' : fillPct > 0 ? 'bg-white/30' : 'bg-cult-surface-inset'
          }`}
          style={{ width: `${Math.max(fillPct, 2)}%` }}
        />
      </div>
    </button>
  );
}
