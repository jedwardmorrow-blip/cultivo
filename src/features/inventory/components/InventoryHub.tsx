import { useEffect, useState } from 'react';
import { Archive, Flag, Activity, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HubShell } from '@/features/hub/components/HubShell';
import { StatCard } from '@/shared/components/StatCard';
import { formatWeight, formatWeightShort } from '@/shared/utils/format';
import { InventoryProjectionPanel } from './InventoryProjectionPanel';
import { BatchLiquidationQueue } from './BatchLiquidationQueue';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategorySums {
  bulkFlower: number;
  trim: number;
  packaged: number;
  concentrates: number;
  flagged: number;
}

interface MovementRow {
  id: string;
  created_at: string | null;
  qty: number | null;
  movement_kind: string | null;
  reason_code: string | null;
  source_item: { strain: string | null; category: string | null } | null;
  dest_item: { strain: string | null; category: string | null } | null;
}

interface FlaggedItem {
  id: string;
  strain: string | null;
  category: string | null;
  review_status: string | null;
  package_id: string;
  on_hand_qty: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBulkFlower(cat: string | null): boolean {
  if (!cat) return false;
  return cat === 'Flower - Bulk' || cat === 'flower_bulk' || cat === 'Flower - Binned' || cat === 'Flower - Bucked';
}

function isTrim(cat: string | null): boolean {
  if (!cat) return false;
  const lower = cat.toLowerCase();
  return lower.includes('trim');
}

function isPackaged(cat: string | null): boolean {
  if (!cat) return false;
  const lower = cat.toLowerCase();
  return lower.includes('packaged') || lower.includes('package');
}

function isConcentrate(cat: string | null): boolean {
  if (!cat) return false;
  const lower = cat.toLowerCase();
  return (
    lower.includes('concentrate') ||
    lower.includes('extract') ||
    lower.includes('kief') ||
    lower.includes('hash') ||
    lower.includes('oil') ||
    lower.includes('rosin') ||
    lower.includes('wax')
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FlagReviewQueue({ items, loading }: { items: FlaggedItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-cult-surface rounded-cult" />)}
      </div>
    );
  }
  if (!items.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No flagged items — all clear.</p>;
  }
  return (
    <div>
      {items.slice(0, 8).map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 py-2 border-b border-cult-surface-raised/50 last:border-b-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-cult-warning-muted text-cult-warning border-cult-warning/30 flex-shrink-0">
              {item.review_status ?? 'flagged'}
            </span>
            <span className="text-[12px] text-cult-text-primary truncate">
              {item.strain ?? 'Unknown strain'}
            </span>
            <span className="text-[11px] text-cult-text-faint truncate">
              {item.category ?? '—'}
            </span>
          </div>
          <span className="text-[11px] text-cult-text-faint flex-shrink-0 font-mono">
            {item.package_id}
          </span>
        </div>
      ))}
      {items.length > 8 && (
        <p className="text-[11px] text-cult-text-faint pt-2">+{items.length - 8} more</p>
      )}
    </div>
  );
}

function MovementLogMini({ movements, loading }: { movements: MovementRow[]; loading: boolean }) {
  const general = movements.filter(m => m.reason_code !== 'qr_scan');

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-7 bg-cult-surface rounded-cult" />)}
      </div>
    );
  }
  if (!general.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No movements in the last 24h.</p>;
  }
  return (
    <div>
      {general.slice(0, 8).map(m => {
        const itemName = m.source_item?.strain ?? m.dest_item?.strain ?? '—';
        const cat = m.source_item?.category ?? m.dest_item?.category ?? '';
        const isIn = m.movement_kind === 'in' || m.movement_kind === 'receive';
        const qtyStr = m.qty != null ? `${isIn ? '+' : '-'}${Math.abs(m.qty)}g` : '—';
        return (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-cult-surface-raised/40 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[12px] text-cult-text-primary truncate block">{itemName}</span>
              {cat && <span className="text-[11px] text-cult-text-faint">{cat}</span>}
            </div>
            <span className={`text-[11px] font-mono flex-shrink-0 ${isIn ? 'text-cult-success' : 'text-cult-danger'}`}>
              {qtyStr}
            </span>
            <span className="text-[11px] text-cult-text-faint flex-shrink-0 w-14 text-right">
              {timeAgo(m.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QRScanLogMini({ movements, loading }: { movements: MovementRow[]; loading: boolean }) {
  const scans = movements.filter(m => m.reason_code === 'qr_scan');

  if (loading) {
    return <div className="animate-pulse h-12 bg-cult-surface rounded-cult" />;
  }
  if (!scans.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No QR scans in the last 24h.</p>;
  }
  return (
    <div>
      {scans.slice(0, 6).map(m => (
        <div
          key={m.id}
          className="flex items-center justify-between gap-3 py-1.5 border-b border-cult-surface-raised/40 last:border-b-0"
        >
          <span className="text-[12px] text-cult-text-primary truncate">
            {m.source_item?.strain ?? m.dest_item?.strain ?? '—'}
          </span>
          <span className="text-[11px] text-cult-text-faint flex-shrink-0">
            {timeAgo(m.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InventoryHub() {
  const [sums, setSums] = useState<CategorySums>({
    bulkFlower: 0, trim: 0, packaged: 0, concentrates: 0, flagged: 0,
  });
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadItems() {
      setLoading(true);
      const { data: items } = await supabase
        .from('inventory_items')
        .select('id, strain, category, on_hand_qty, review_status, package_id')
        .gt('on_hand_qty', 0);

      if (!mounted || !items) { setLoading(false); return; }

      let bulkFlower = 0, trim = 0, packaged = 0, concentrates = 0;
      const flagged: FlaggedItem[] = [];

      for (const item of items) {
        const qty = item.on_hand_qty ?? 0;
        if (isBulkFlower(item.category)) bulkFlower += qty;
        else if (isTrim(item.category)) trim += qty;
        else if (isPackaged(item.category)) packaged += qty;
        else if (isConcentrate(item.category)) concentrates += qty;

        if (item.review_status && item.review_status !== 'approved') {
          flagged.push(item as unknown as FlaggedItem);
        }
      }

      setSums({ bulkFlower, trim, packaged, concentrates, flagged: flagged.length });
      setFlaggedItems(flagged);
      setLoading(false);
    }
    loadItems();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadMovements() {
      setMovementsLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('inventory_movements')
        .select(`
          id, created_at, qty, movement_kind, reason_code,
          source_item:inventory_items!inventory_movements_source_item_id_fkey(strain, category),
          dest_item:inventory_items!inventory_movements_dest_item_id_fkey(strain, category)
        `)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!mounted) return;
      setMovements((data ?? []) as unknown as MovementRow[]);
      setMovementsLoading(false);
    }
    loadMovements();
    return () => { mounted = false; };
  }, []);

  const bulkTotal = sums.bulkFlower + sums.trim;
  const kpis = [
    { label: 'Total Bulk', value: loading ? '—' : formatWeightShort(bulkTotal), sub: 'flower + trim' },
    { label: 'Packaged Units', value: loading ? '—' : formatWeight(sums.packaged), sub: 'available' },
    { label: 'Items Flagged', value: loading ? '—' : String(sums.flagged), sub: 'pending review' },
  ];

  return (
    <HubShell section="Inventory" icon={Archive} kpis={kpis}>
      <div className="space-y-6">

        {/* Category breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Bulk Flower"
            value={loading ? '—' : formatWeight(sums.bulkFlower)}
            variant={sums.bulkFlower > 0 ? 'success' : 'default'}
          />
          <StatCard
            label="Trim"
            value={loading ? '—' : formatWeight(sums.trim)}
          />
          <StatCard
            label="Packaged"
            value={loading ? '—' : formatWeight(sums.packaged)}
            variant="accent"
          />
          <StatCard
            label="Concentrates"
            value={loading ? '—' : formatWeight(sums.concentrates)}
          />
        </div>

        {/* Flag Review Queue */}
        <div className="bg-cult-surface border border-cult-surface rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <Flag className="w-4 h-4 text-cult-warning" />
            Flag Review Queue
          </h2>
          <FlagReviewQueue items={flaggedItems} loading={loading} />
        </div>

        {/* Liquidation Queue */}
        <BatchLiquidationQueue />

        {/* Inventory Projection */}
        <InventoryProjectionPanel />

        {/* Logs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-cult-surface border border-cult-surface rounded-cult p-4">
            <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Movement Log (24h)
            </h2>
            <MovementLogMini movements={movements} loading={movementsLoading} />
          </div>

          <div className="bg-cult-surface border border-cult-surface rounded-cult p-4">
            <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Scan Log (24h)
            </h2>
            <QRScanLogMini movements={movements} loading={movementsLoading} />
          </div>
        </div>

      </div>
    </HubShell>
  );
}
