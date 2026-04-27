/**
 * InProductionPanel — C Hybrid (gapped outer card, hairline interior rows).
 * Read-only status card showing inventory currently in the production
 * dispatch queue. No pulse glow border; no fills.
 */

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  buck: 'bucking',
  trim_to_stock: 'trim',
  package_to_order: 'packaging',
  pack_to_stock: 'pack',
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

interface InProductionPanelProps {
  onNavigateToDispatch?: () => void;
}

const VISIBLE_LIMIT = 4;

export function InProductionPanel({ onNavigateToDispatch }: InProductionPanelProps) {
  const [items, setItems] = useState<InFlightItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from('production_dispatch_items')
        .select(
          `id, processing_stage, status, quantity_units_target, quantity_g,
           batch_registry!inner(strain),
           order_items(orders(order_number, customer_name))`,
        )
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!mounted) return;
      setLoading(false);
      if (!data) return;

      setItems(
        data.map((row: any) => ({
          id: row.id,
          strain: row.batch_registry?.strain ?? '—',
          processing_stage: row.processing_stage,
          status: row.status,
          quantity_units_target: row.quantity_units_target,
          quantity_g: row.quantity_g,
          customer_name: row.order_items?.orders?.customer_name ?? null,
          order_number: row.order_items?.orders?.order_number ?? null,
        })),
      );
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;

  const visible = items.slice(0, VISIBLE_LIMIT);
  const overflow = items.length - visible.length;

  return (
    <div
      onClick={onNavigateToDispatch}
      style={{
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
        cursor: onNavigateToDispatch ? 'pointer' : 'default',
      }}
    >
      {/* Panel head */}
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '12px 14px 10px' }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink-3)' }}
        >
          In production
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
        >
          {items.length === 0 ? 'none queued' : `${items.length} active`}
        </span>
      </div>

      {visible.length === 0 ? (
        <div
          className="text-center"
          style={{
            padding: 14,
            fontSize: 11,
            color: 'var(--op-ink-3)',
            borderTop: '1px solid var(--op-line)',
          }}
        >
          Nothing in production queue
        </div>
      ) : (
        visible.map((item, i) => {
          const isLast = i === visible.length - 1 && overflow <= 0;
          return (
            <div
              key={item.id}
              style={{
                padding: '10px 14px',
                borderTop: i === 0 ? '1px solid var(--op-line)' : undefined,
                borderBottom: isLast ? 'none' : '1px solid var(--op-line)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background:
                    item.status === 'in_progress'
                      ? 'var(--accent)'
                      : 'var(--op-ink-3)',
                  flexShrink: 0,
                }}
              />
              <div className="min-w-0">
                <div className="font-sans truncate" style={{ fontSize: 11, color: 'var(--op-ink)' }}>
                  {item.strain}
                </div>
                <div
                  className="font-mono tabular-nums truncate"
                  style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
                >
                  {STAGE_LABELS[item.processing_stage] ?? item.processing_stage}
                  {item.order_number ? ` · ${item.order_number}` : ''}
                </div>
              </div>
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: 11, color: 'var(--op-ink)' }}
              >
                {formatQty(item)}
              </span>
            </div>
          );
        })
      )}

      {overflow > 0 && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--op-line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--op-ink-3)', letterSpacing: '0.04em' }}
          >
            and {overflow} more
          </span>
          {onNavigateToDispatch && (
            <span
              className="font-mono uppercase flex items-center"
              style={{
                fontSize: 9,
                letterSpacing: '0.1em',
                color: 'var(--op-ink-2)',
                gap: 2,
              }}
            >
              View all <ChevronRight className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
