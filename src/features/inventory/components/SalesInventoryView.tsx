import { useMemo, useState } from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useInventoryData } from '../hooks/useInventoryData';
import { useQualityGrades } from '@/hooks/useQualityGrades';
import { getItemStage } from '../hooks/useInventoryFilters';
import type { InventoryItem } from '../types';
import type { QualityGrade } from '@/types';

const SELLABLE_STAGES = new Set(['bulk', 'packaged']);

function gramsToLbs(g: number): string {
  const lbs = g / 453.592;
  return lbs < 0.1 ? '<0.1' : lbs.toFixed(1);
}

interface StrainRow {
  strain: string;
  bulkGrams: number;
  packagedGrams: number;
  packagedUnits: number;
  reservedGrams: number;
}

interface GradeBucket {
  gradeId: string | null;
  grade: QualityGrade | null;
  availableGrams: number;
  reservedGrams: number;
  strains: StrainRow[];
}

function buildGradeBuckets(
  items: InventoryItem[],
  getGradeById: (id: string | null | undefined) => QualityGrade | null
): GradeBucket[] {
  const bucketMap = new Map<string | null, GradeBucket>();

  for (const item of items) {
    const stage = getItemStage(item);
    if (!stage || !SELLABLE_STAGES.has(stage)) continue;
    if ((item.available_qty ?? 0) <= 0) continue;

    const gradeId = item.quality_grade_id ?? null;
    const grade = getGradeById(gradeId);

    if (!bucketMap.has(gradeId)) {
      bucketMap.set(gradeId, { gradeId, grade, availableGrams: 0, reservedGrams: 0, strains: [] });
    }

    const bucket = bucketMap.get(gradeId)!;
    const avail = item.available_qty ?? 0;
    const reserved = item.reserved_qty ?? 0;
    bucket.availableGrams += avail;
    bucket.reservedGrams += reserved;

    const strain = item.strain || 'Unknown';
    let row = bucket.strains.find((s) => s.strain === strain);
    if (!row) {
      row = { strain, bulkGrams: 0, packagedGrams: 0, packagedUnits: 0, reservedGrams: 0 };
      bucket.strains.push(row);
    }

    if (stage === 'bulk') {
      row.bulkGrams += avail;
    } else {
      if (item.unit === 'units' || item.unit === 'unit') {
        row.packagedUnits += avail;
      } else {
        row.packagedGrams += avail;
      }
    }
    row.reservedGrams += reserved;
  }

  return Array.from(bucketMap.values()).sort((a, b) => {
    if (a.gradeId === null) return 1;
    if (b.gradeId === null) return -1;
    return (a.grade?.sort_order ?? 99) - (b.grade?.sort_order ?? 99);
  });
}

function totalAvailableLbs(buckets: GradeBucket[]): string {
  return gramsToLbs(buckets.reduce((s, b) => s + b.availableGrams, 0));
}

export function SalesInventoryView() {
  const { inventoryItems, loading, fetchInventory } = useInventoryData();
  const { grades, getGradeById } = useQualityGrades();
  const [search, setSearch] = useState('');

  const allBuckets = useMemo(
    () => buildGradeBuckets(inventoryItems, getGradeById),
    [inventoryItems, grades]
  );

  const buckets = useMemo(() => {
    if (!search.trim()) return allBuckets;
    const q = search.toLowerCase();
    return allBuckets
      .map((b) => ({ ...b, strains: b.strains.filter((s) => s.strain.toLowerCase().includes(q)) }))
      .filter((b) => b.strains.length > 0);
  }, [allBuckets, search]);

  const totalLbs = useMemo(() => totalAvailableLbs(allBuckets), [allBuckets]);
  const strainCount = useMemo(
    () => new Set(allBuckets.flatMap((b) => b.strains.map((s) => s.strain))).size,
    [allBuckets]
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cult-text-primary">Available Inventory</h1>
          <p className="text-cult-text-muted text-sm mt-1.5">
            {totalLbs} lbs across {strainCount} strain{strainCount !== 1 ? 's' : ''} — by grade
          </p>
        </div>
        <button
          onClick={() => fetchInventory()}
          className="flex items-center gap-2 text-sm text-cult-text-secondary hover:text-cult-text-primary transition-colors mt-1"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search strains..."
          className="w-full pl-9 pr-4 py-2 bg-cult-surface border border-cult-border rounded text-cult-text-primary placeholder-cult-text-secondary focus:ring-1 focus:ring-cult-border-strong focus:border-cult-border-strong text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="text-cult-text-secondary text-sm py-12 text-center">Loading inventory...</div>
      ) : buckets.length === 0 ? (
        <div className="bg-cult-surface border border-cult-border rounded p-12 text-center">
          <p className="text-cult-text-secondary text-sm">
            {search ? `No strains match "${search}"` : 'No sellable inventory available'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {buckets.map((bucket) => (
            <GradeBucketCard key={bucket.gradeId ?? '__ungraded'} bucket={bucket} />
          ))}
        </div>
      )}
    </div>
  );
}

function GradeBucketCard({ bucket }: { bucket: GradeBucket }) {
  const isUngraded = bucket.gradeId === null;
  const label = isUngraded ? 'UNGRADED' : (bucket.grade?.code ?? bucket.grade?.label ?? 'UNKNOWN');
  const availLbs = gramsToLbs(bucket.availableGrams);
  const reservedLbs = gramsToLbs(bucket.reservedGrams);
  const hasReserved = bucket.reservedGrams > 0;

  return (
    <div className={`bg-cult-surface border rounded overflow-hidden ${isUngraded ? 'border-cult-border' : 'border-cult-border-strong'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-cult-border">
        <div className="flex items-center gap-3">
          {isUngraded && <AlertCircle className="w-4 h-4 text-cult-text-secondary flex-shrink-0" />}
          <span className={`font-mono text-sm font-semibold tracking-widest uppercase ${isUngraded ? 'text-cult-text-secondary' : 'text-cult-text-primary'}`}>
            {label}
          </span>
          {isUngraded && (
            <span className="text-xs text-cult-text-secondary font-mono">needs grading</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-lg font-bold text-cult-text-primary tabular-nums">{availLbs}</span>
            <span className="text-xs text-cult-text-secondary ml-1">lbs avail</span>
          </div>
          {hasReserved && (
            <div>
              <span className="text-sm font-medium text-cult-text-secondary tabular-nums">{reservedLbs}</span>
              <span className="text-xs text-cult-text-secondary ml-1">promised</span>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-cult-border">
        {bucket.strains
          .sort((a, b) => (b.bulkGrams + b.packagedGrams) - (a.bulkGrams + a.packagedGrams))
          .map((row) => (
            <StrainRowView key={row.strain} row={row} />
          ))}
      </div>
    </div>
  );
}

function StrainRowView({ row }: { row: StrainRow }) {
  const hasReserved = row.reservedGrams > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-cult-text-primary">{row.strain}</span>
      <div className="flex items-center gap-4 text-right">
        {row.bulkGrams > 0 && (
          <span className="text-xs text-cult-text-secondary tabular-nums">
            {gramsToLbs(row.bulkGrams)} lbs bulk
          </span>
        )}
        {row.packagedGrams > 0 && (
          <span className="text-xs text-cult-text-secondary tabular-nums">
            {gramsToLbs(row.packagedGrams)} lbs pkgd
          </span>
        )}
        {row.packagedUnits > 0 && (
          <span className="text-xs text-cult-text-secondary tabular-nums">
            {row.packagedUnits.toLocaleString()} units
          </span>
        )}
        {hasReserved && (
          <span className="text-xs text-cult-text-secondary tabular-nums">
            {gramsToLbs(row.reservedGrams)} promised
          </span>
        )}
      </div>
    </div>
  );
}
