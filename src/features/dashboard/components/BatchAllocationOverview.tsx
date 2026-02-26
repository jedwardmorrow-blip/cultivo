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
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'allocated':
        return <Package className="w-5 h-5 text-blue-400" />;
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <TrendingUp className="w-5 h-5 text-cult-light-gray" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over_allocated':
        return 'border-red-600 bg-red-900/20';
      case 'allocated':
        return 'border-blue-600 bg-blue-900/20';
      case 'available':
        return 'border-green-600 bg-green-900/20';
      default:
        return 'border-cult-medium-gray bg-cult-near-black';
    }
  };

  const getUtilizationColor = (pct: number) => {
    if (pct >= 100) return 'text-red-400';
    if (pct >= 80) return 'text-yellow-400';
    if (pct >= 50) return 'text-blue-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="bg-cult-near-black border-2 border-cult-medium-gray p-6">
        <div className="text-cult-light-gray">Loading batch allocations...</div>
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
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">Batch Allocation Overview</h2>
          <p className="text-cult-light-gray mt-1">Track batch utilization and capacity</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-cult-light-gray uppercase tracking-wider">Over Allocated</p>
            <p className="text-2xl font-bold text-red-400">{overAllocated.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-cult-light-gray uppercase tracking-wider">Allocated</p>
            <p className="text-2xl font-bold text-blue-400">{allocated.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-cult-light-gray uppercase tracking-wider">Available</p>
            <p className="text-2xl font-bold text-green-400">{available.length}</p>
          </div>
        </div>
      </div>

      {allocations.length === 0 ? (
        <div className="bg-cult-near-black border-2 border-cult-medium-gray p-12 text-center text-cult-light-gray">
          No batch allocations found
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {allocations.map((batch) => (
            <div
              key={batch.batch_id}
              className={`border-2 p-4 ${getStatusColor(batch.allocation_status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(batch.allocation_status)}
                    <h3 className="text-lg font-bold text-cult-white uppercase tracking-wide">
                      {batch.batch_id}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-cult-light-gray">{batch.strain}</p>
                    <QualityGradeBadge gradeId={batchGrades[batch.batch_id] ?? null} />
                  </div>
                  <p className="text-xs text-cult-lighter-gray mt-1">{batch.current_stage}</p>
                </div>
                {batch.orders_assigned > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-cult-light-gray uppercase">Orders</p>
                    <p className="text-xl font-bold text-cult-white">{batch.orders_assigned}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t-2 border-cult-medium-gray">
                {/* 8ths */}
                {(batch.eighths_demand > 0 || batch.eighths_capacity > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cult-light-gray uppercase tracking-wider">8ths</span>
                      <span className={`text-sm font-bold ${getUtilizationColor(batch.eighths_utilization_pct)}`}>
                        {batch.eighths_utilization_pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cult-lighter-gray">
                        {batch.eighths_demand} / {batch.eighths_capacity}
                      </span>
                      <span className={batch.eighths_remaining < 0 ? 'text-red-400' : 'text-cult-white'}>
                        {batch.eighths_remaining} left
                      </span>
                    </div>
                    <div className="w-full h-2 bg-cult-black mt-1">
                      <div
                        className={`h-full ${
                          batch.eighths_utilization_pct >= 100
                            ? 'bg-red-500'
                            : batch.eighths_utilization_pct >= 80
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(batch.eighths_utilization_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Halves */}
                {(batch.halves_demand > 0 || batch.halves_capacity > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cult-light-gray uppercase tracking-wider">Halves</span>
                      <span className={`text-sm font-bold ${getUtilizationColor(batch.halves_utilization_pct)}`}>
                        {batch.halves_utilization_pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cult-lighter-gray">
                        {batch.halves_demand} / {batch.halves_capacity}
                      </span>
                      <span className={batch.halves_remaining < 0 ? 'text-red-400' : 'text-cult-white'}>
                        {batch.halves_remaining} left
                      </span>
                    </div>
                    <div className="w-full h-2 bg-cult-black mt-1">
                      <div
                        className={`h-full ${
                          batch.halves_utilization_pct >= 100
                            ? 'bg-red-500'
                            : batch.halves_utilization_pct >= 80
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(batch.halves_utilization_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Pounds */}
                {(batch.pounds_demand > 0 || batch.pounds_capacity > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cult-light-gray uppercase tracking-wider">Pounds</span>
                      <span className={`text-sm font-bold ${getUtilizationColor(batch.pounds_utilization_pct)}`}>
                        {batch.pounds_utilization_pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cult-lighter-gray">
                        {batch.pounds_demand} / {batch.pounds_capacity}
                      </span>
                      <span className={batch.pounds_remaining < 0 ? 'text-red-400' : 'text-cult-white'}>
                        {batch.pounds_remaining} left
                      </span>
                    </div>
                    <div className="w-full h-2 bg-cult-black mt-1">
                      <div
                        className={`h-full ${
                          batch.pounds_utilization_pct >= 100
                            ? 'bg-red-500'
                            : batch.pounds_utilization_pct >= 80
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(batch.pounds_utilization_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
