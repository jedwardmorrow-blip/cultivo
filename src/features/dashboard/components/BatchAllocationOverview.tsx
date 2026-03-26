/**
 * @deprecated — Renamed from BatchAllocationOverview to DemandUtilizationWidget.
 * This widget shows order demand vs. batch capacity (the allocation model),
 * NOT the SKU yield projection model used by BatchAllocationPanel.
 * Currently not rendered in any view. Safe to remove or replace.
 */
import { useEffect, useState } from 'react';
import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBatchAllocationOverview } from '../services/dashboard.service';
import { QualityGradeBadge } from '@/shared/components';

interface BatchAllocation {
  batch_id: string;
  strain: string;
  current_stage: string;
  current_weight_grams: number;
  estimated_final_weight_grams: number;
  orders_assigned: number;
  eighths_demand: number;
  eighths_capacity: number;
  eighths_remaining: number;
  eighths_utilization_pct: number;
  halves_demand: number;
  halves_capacity: number;
  halves_remaining: number;
  halves_utilization_pct: number;
  pounds_demand: number;
  pounds_capacity: number;
  pounds_remaining: number;
  pounds_utilization_pct: number;
  allocation_status: string;
}

export function BatchAllocationOverview() {
  const [allocations, setAllocations] = useState<BatchAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchGrades, setBatchGrades] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadBatchAllocations();

    const channel = supabase
      .channel('batch-allocations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, loadBatchAllocations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBatchAllocations = async () => {
    try {
      const { data } = await getBatchAllocationOverview();
      setAllocations(data || []);

      if (data && data.length > 0) {
        const batchIds = data.map((a: BatchAllocation) => a.batch_id);
        const { data: grades } = await supabase
          .from('batch_registry')
          .select('id, quality_grade_id')
          .in('id', batchIds);
        if (grades) {
          const map: Record<string, string | null> = {};
          grades.forEach((g: any) => { map[g.id] = g.quality_grade_id; });
          setBatchGrades(map);
        }
      }
    } catch (error) {
      console.error('Error loading batch allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over_allocated':
        return <AlertTriangle className="w-4 h-4 text-cult-danger" />;
      case 'allocated':
        return <Package className="w-4 h-4 text-cult-text-secondary" />;
      case 'available':
        return <CheckCircle className="w-4 h-4 text-cult-success" />;
      default:
        return <TrendingUp className="w-4 h-4 text-cult-text-muted" />;
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'over_allocated':
        return 'border-cult-danger';
      default:
        return 'border-cult-border';
    }
  };

  const getUtilizationColor = (pct: number) => {
    if (pct >= 100) return 'text-cult-danger';
    if (pct >= 80) return 'text-cult-warning';
    return 'text-cult-text-secondary';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-cult-danger';
    if (pct >= 80) return 'bg-cult-warning';
    return 'bg-cult-text-muted';
  };

  if (loading) {
    return (
      <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6">
        <div className="text-cult-text-muted text-xs uppercase tracking-widest animate-pulse">Loading batch allocations...</div>
      </div>
    );
  }

  const overAllocated = allocations.filter(a => a.allocation_status === 'over_allocated');
  const allocated = allocations.filter(a => a.allocation_status === 'allocated');
  const available = allocations.filter(a => a.allocation_status === 'available');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-cult-text-primary uppercase tracking-[1.5px]">Batch Allocation Overview</h2>
          <p className="text-[0.6875rem] text-cult-text-muted mt-0.5">Track batch utilization and capacity</p>
        </div>
        <div className="flex items-center gap-6">
          {overAllocated.length > 0 && (
            <div className="text-center">
              <p className="text-[0.625rem] text-cult-text-muted uppercase tracking-wider">Over</p>
              <p className="text-lg font-bold text-cult-danger">{overAllocated.length}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[0.625rem] text-cult-text-muted uppercase tracking-wider">Allocated</p>
            <p className="text-lg font-bold text-cult-text-secondary">{allocated.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[0.625rem] text-cult-text-muted uppercase tracking-wider">Available</p>
            <p className="text-lg font-bold text-cult-success">{available.length}</p>
          </div>
        </div>
      </div>

      {allocations.length === 0 ? (
        <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-12 text-center text-cult-text-muted">
          No batch allocations found
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {allocations.map((batch) => (
            <div
              key={batch.batch_id}
              className={`bg-cult-surface-raised border rounded-cult p-4 animate-fade-in
                hover:border-cult-border-strong transition-colors duration-200
                ${getStatusBorder(batch.allocation_status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(batch.allocation_status)}
                    <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wide">
                      {batch.batch_id}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-cult-text-secondary">{batch.strain}</p>
                    <QualityGradeBadge gradeId={batchGrades[batch.batch_id] ?? null} />
                  </div>
                  <p className="text-[0.6875rem] text-cult-text-muted mt-0.5">{batch.current_stage}</p>
                </div>
                {batch.orders_assigned > 0 && (
                  <div className="text-right">
                    <p className="text-[0.625rem] text-cult-text-muted uppercase">Orders</p>
                    <p className="text-lg font-bold text-cult-text-primary">{batch.orders_assigned}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-cult-border">
                {/* 8ths */}
                {(batch.eighths_demand > 0 || batch.eighths_capacity > 0) && (
                  <UtilBar
                    label="8ths"
                    demand={batch.eighths_demand}
                    capacity={batch.eighths_capacity}
                    remaining={batch.eighths_remaining}
                    pct={batch.eighths_utilization_pct}
                    getUtilColor={getUtilizationColor}
                    getBarCol={getBarColor}
                  />
                )}

                {/* Halves */}
                {(batch.halves_demand > 0 || batch.halves_capacity > 0) && (
                  <UtilBar
                    label="Halves"
                    demand={batch.halves_demand}
                    capacity={batch.halves_capacity}
                    remaining={batch.halves_remaining}
                    pct={batch.halves_utilization_pct}
                    getUtilColor={getUtilizationColor}
                    getBarCol={getBarColor}
                  />
                )}

                {/* Pounds */}
                {(batch.pounds_demand > 0 || batch.pounds_capacity > 0) && (
                  <UtilBar
                    label="Pounds"
                    demand={batch.pounds_demand}
                    capacity={batch.pounds_capacity}
                    remaining={batch.pounds_remaining}
                    pct={batch.pounds_utilization_pct}
                    getUtilColor={getUtilizationColor}
                    getBarCol={getBarColor}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Extracted utilization bar to reduce repetition */
function UtilBar({
  label,
  demand,
  capacity,
  remaining,
  pct,
  getUtilColor,
  getBarCol,
}: {
  label: string;
  demand: number;
  capacity: number;
  remaining: number;
  pct: number;
  getUtilColor: (p: number) => string;
  getBarCol: (p: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.625rem] text-cult-text-muted uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-semibold ${getUtilColor(pct)}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-cult-text-muted">
          {demand} / {capacity}
        </span>
        <span className={remaining < 0 ? 'text-cult-danger' : 'text-cult-text-secondary'}>
          {remaining} left
        </span>
      </div>
      <div className="w-full h-1.5 bg-cult-surface-overlay rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarCol(pct)}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
