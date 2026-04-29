/**
 * InProductionPanel — Bento card showing inventory currently in the production dispatch queue.
 *
 * Compact: count + top items list
 * No expanded mode — this is a read-only status card.
 * Data fetched here to keep DistributionCommandCenter clean.
 */

import { useState, useEffect } from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GLASS, GLASS_HOVER } from '../constants';

// ─── Types ─────────────────────────────────────────────────────────────────

interface InFlightItem {
  id: string;
  strain: string;
  processing_stage: string;
  status: 'pending' | 'in_progress';
  quantity_units_target: number | null;
  quantity_g: number | null;
  customer_name: string | null;
  order_number: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  buck: 'Bucking',
  trim_to_stock: 'Trimming',
  package_to_order: 'Packaging',
};

function formatQty(item: InFlightItem): string {
  if (item.quantity_units_target) return `${item.quantity_units_target}u`;
  if (item.quantity_g) {
    return item.quantity_g >= 453.592
      ? `${(item.quantity_g / 453.592).toFixed(1)} lbs`
      : `${item.quantity_g.toFixed(0)}g`;
  }
  return '—';
}

// ─── Component ─────────────────────────────────────────────────────────────

interface InProductionPanelProps {
  onNavigateToDispatch?: () => void;
}

export function InProductionPanel({ onNavigateToDispatch }: InProductionPanelProps) {
  const [items, setItems] = useState<InFlightItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('production_dispatch_items')
        .select(`
          id, processing_stage, status, quantity_units_target, quantity_g,
          batch_registry!inner(strain),
          order_items(orders(order_number, customer_name))
        `)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!mounted) return;
      setLoading(false);

      if (!data) return;
      setItems(data.map((row: any) => ({
        id: row.id,
        strain: row.batch_registry?.strain ?? '—',
        processing_stage: row.processing_stage,
        status: row.status,
        quantity_units_target: row.quantity_units_target,
        quantity_g: row.quantity_g,
        customer_name: row.order_items?.orders?.customer_name ?? null,
        order_number: row.order_items?.orders?.order_number ?? null,
      })));
    }

    load();
    return () => { mounted = false; };
  }, []);

  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const pending = items.filter(i => i.status === 'pending').length;
  const hasItems = items.length > 0;

  if (loading) return null;

  return (
    <div
      onClick={onNavigateToDispatch}
      className={`${GLASS} ${onNavigateToDispatch ? `${GLASS_HOVER} cursor-pointer` : ''} p-3`}
      style={hasItems ? {
        borderColor: 'rgba(245,158,11,0.15)',
        boxShadow: '0 0 8px rgba(245,158,11,0.06), 0 4px 24px rgba(0,0,0,0.4)',
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400/60" />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">In Production</span>
        </div>
        <div className="flex items-center gap-1.5">
          {inProgress > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
              {inProgress} active
            </span>
          )}
          <span className={`text-sm font-bold ${hasItems ? 'text-amber-400' : 'text-white/20'}`}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Content */}
      {!hasItems ? (
        <p className="text-[11px] text-white/20">Nothing queued for production</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {items.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.status === 'in_progress' ? 'bg-sky-400' : 'bg-amber-400/60'
                  }`} />
                  <span className="text-white/60 truncate">{item.strain}</span>
                  <span className="text-white/25 shrink-0">· {STAGE_LABELS[item.processing_stage] ?? item.processing_stage}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.customer_name && (
                    <span className="text-white/25 truncate max-w-[60px]">{item.customer_name}</span>
                  )}
                  <span className="text-white/40 font-medium tabular-nums">{formatQty(item)}</span>
                </div>
              </div>
            ))}
          </div>
          {items.length > 4 && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/[0.05]">
              <span className="text-[10px] text-white/20">+{items.length - 4} more items</span>
              {onNavigateToDispatch && (
                <span className="text-[10px] text-amber-400/50 flex items-center gap-0.5">
                  View all <ChevronRight className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          )}
          {pending > 0 && inProgress === 0 && (
            <p className="text-[10px] text-white/20 mt-1.5">{pending} item{pending !== 1 ? 's' : ''} queued, waiting for session</p>
          )}
        </>
      )}
    </div>
  );
}
