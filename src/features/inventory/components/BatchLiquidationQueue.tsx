import { useEffect, useState } from 'react';
import { ArrowUp, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatWeight } from '@/shared/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiquidationRow {
  batch_number: string;
  strain_name: string;
  harvested_at: string;
  days_since_harvest: number;
  available_g: number;
  committed_g: number;
  rank: number;
}

interface BatchRegistryRow {
  batch_number: string;
  strain_id: string | null;
  harvested_at: string | null;
  strains: { name: string } | null;
}

interface InventoryItemRow {
  batch_id: string | null;
  on_hand_qty: number | null;
}

interface OrderItemRow {
  batch_id: string | null;
  quantity: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function AgeBadge({ days }: { days: number }) {
  if (days < 14) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium whitespace-nowrap">
        {days}d
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium whitespace-nowrap">
        {days}d
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-500/15 text-red-300 border-red-500/30 font-medium whitespace-nowrap">
      {days}d
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map(i => (
        <tr key={i} className="animate-pulse">
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-6" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-24" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-20" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-12" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BatchLiquidationQueue() {
  const [rows, setRows] = useState<LiquidationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      // Fetch batches with harvested_at, joined with strain name
      const { data: batches } = await supabase
        .from('batch_registry')
        .select('batch_number, strain_id, harvested_at, strains(name)')
        .not('harvested_at', 'is', null)
        .order('harvested_at', { ascending: true })
        .limit(100) as { data: BatchRegistryRow[] | null };

      if (!mounted || !batches || batches.length === 0) {
        setLoading(false);
        return;
      }

      const batchNumbers = batches.map(b => b.batch_number);

      // Fetch available grams per batch from inventory_items
      const { data: invItems } = await supabase
        .from('inventory_items')
        .select('batch_id, on_hand_qty')
        .in('batch_id', batchNumbers)
        .gt('on_hand_qty', 0) as { data: InventoryItemRow[] | null };

      // Aggregate available grams per batch_id
      const atpMap: Record<string, number> = {};
      for (const item of invItems ?? []) {
        if (item.batch_id) {
          atpMap[item.batch_id] = (atpMap[item.batch_id] ?? 0) + (item.on_hand_qty ?? 0);
        }
      }

      // Fetch committed grams from active order_items
      // Join via orders view — filter out cancelled/delivered/completed orders
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('batch_id, quantity, orders!inner(status)')
        .in('batch_id', batchNumbers)
        .not('orders.status', 'in', '(cancelled,delivered,completed)') as { data: OrderItemRow[] | null };

      // Aggregate committed grams per batch_id
      const committedMap: Record<string, number> = {};
      for (const item of orderItems ?? []) {
        if (item.batch_id) {
          committedMap[item.batch_id] = (committedMap[item.batch_id] ?? 0) + (item.quantity ?? 0);
        }
      }

      if (!mounted) return;

      // Build rows, sorted oldest first (already sorted by query)
      const built: LiquidationRow[] = batches
        .filter(b => b.harvested_at)
        .map((b, idx) => ({
          batch_number: b.batch_number,
          strain_name: b.strains?.name ?? b.batch_number,
          harvested_at: b.harvested_at!,
          days_since_harvest: daysSince(b.harvested_at!),
          available_g: atpMap[b.batch_number] ?? 0,
          committed_g: committedMap[b.batch_number] ?? 0,
          rank: idx + 1,
        }));

      setRows(built);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, []);

  // "Ship First" rank is the oldest batch that has ATP > 0
  const shipFirstBatch = rows.find(r => r.available_g > 0);

  return (
    <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-label font-semibold text-cult-text-primary uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Liquidation Queue
        </h2>
        <span className="text-[11px] text-cult-text-faint">Oldest batch first — ship to reduce holding cost</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-cult-charcoal/60">
              {['#', 'Batch / Strain', 'Harvested', 'Age', 'Available (ATP)', 'Committed'].map(h => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[10px] font-semibold text-cult-text-faint uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/30">
            {loading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-cult-text-faint text-[12px]">
                  No harvested batches found.
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const isShipFirst = shipFirstBatch?.batch_number === row.batch_number;
                const hasAtp = row.available_g > 0;

                return (
                  <tr
                    key={row.batch_number}
                    className={`transition-colors ${
                      isShipFirst
                        ? 'bg-amber-950/20 hover:bg-amber-950/30'
                        : 'hover:bg-cult-graphite/20'
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-mono ${isShipFirst ? 'text-amber-300 font-semibold' : 'text-cult-text-faint'}`}>
                          #{row.rank}
                        </span>
                        {isShipFirst && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold whitespace-nowrap">
                            <ArrowUp className="w-2.5 h-2.5" />
                            Ship First
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Batch / Strain */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-cult-text-primary font-medium whitespace-nowrap">
                          {row.strain_name}
                        </span>
                        <span className="text-[10px] text-cult-text-faint font-mono">
                          {row.batch_number}
                        </span>
                      </div>
                    </td>

                    {/* Harvested date */}
                    <td className="px-3 py-2.5 text-cult-text-secondary whitespace-nowrap">
                      {new Date(row.harvested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Age badge */}
                    <td className="px-3 py-2.5">
                      <AgeBadge days={row.days_since_harvest} />
                    </td>

                    {/* Available (ATP) */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {hasAtp ? (
                        <span className="text-emerald-300 font-medium">
                          {formatWeight(row.available_g)}
                        </span>
                      ) : (
                        <span className="text-cult-text-faint">—</span>
                      )}
                    </td>

                    {/* Committed */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.committed_g > 0 ? (
                        <span className="text-cult-text-secondary">
                          {formatWeight(row.committed_g)}
                        </span>
                      ) : (
                        <span className="text-cult-text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className="text-[10px] text-cult-text-faint mt-3 pt-3 border-t border-cult-charcoal/40">
          Age badge: green &lt;14d · amber 14–30d · red &gt;30d.
          ATP = on-hand inventory with qty &gt; 0.
          Committed = pending/active order line items assigned to batch.
          "Ship First" = oldest batch with available ATP.
        </p>
      )}
    </div>
  );
}
