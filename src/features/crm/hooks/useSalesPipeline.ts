import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getSalesDashboard,
  getBatchDetails,
  type SalesDashboardRow,
  type BatchDetailRow,
} from '../services/salesPipeline.service';

export type HealthStatus = 'critical' | 'low' | 'warning' | 'healthy';
export type GradeCode = 'CULT' | 'B' | 'C' | 'D' | 'UNDEFINED';
export type SortMode = 'revenue' | 'health' | 'name';

export interface StrainPipelineEntry {
  strain: string;
  sellableFlowerGrams: number;
  sellableSmallsGrams: number;
  packagedUnits: number;
  pipelineGrams: number;
  byproductGrams: number;
  totalSellableGrams: number;
  demandRevenue: number;
  demandUnits: number;
  demandOrders: number;
  supplyHealth: HealthStatus;
  primaryGrade: GradeCode;
  stages: {
    binned: number;
    bucked: number;
    trimmed: number;
    packaged: number;
    byproduct: number;
  };
}

export interface PipelineSummary {
  totals: {
    sellableFlowerGrams: number;
    sellableSmallsGrams: number;
    packagedUnits: number;
    pipelineGrams: number;
    byproductGrams: number;
    totalSellableGrams: number;
    activeDemandRevenue: number;
    activeOrders: number;
  };
  stageTotals: {
    binned: number;
    bucked: number;
    trimmed: number;
    packaged: number;
    byproduct: number;
  };
  healthDistribution: Record<HealthStatus, number>;
  strainCount: {
    total: number;
    withActiveDemand: number;
    supplyOnly: number;
  };
}

function mapRow(row: SalesDashboardRow): StrainPipelineEntry {
  const sellableFlower = Number(row.sellable_flower_grams) || 0;
  const sellableSmalls = Number(row.sellable_smalls_grams) || 0;
  const packaged = Number(row.packaged_units) || 0;
  const pipelineBinned = Number(row.pipeline_binned_grams) || 0;
  const pipelineBucked = Number(row.pipeline_bucked_grams) || 0;
  const pipeline = Number(row.pipeline_grams) || 0;
  const byproduct = Number(row.byproduct_grams) || 0;
  const totalSellable = Number(row.total_sellable) || 0;
  const demandValue = Number(row.demand_value) || 0;
  const demandUnits = Number(row.demand_units) || 0;
  const demandOrders = Number(row.demand_orders) || 0;

  const grade = (['CULT', 'B', 'C', 'D', 'UNDEFINED'] as GradeCode[]).includes(row.grade_code as GradeCode)
    ? (row.grade_code as GradeCode)
    : 'UNDEFINED';

  const health = (['critical', 'low', 'warning', 'healthy'] as HealthStatus[]).includes(row.health_status as HealthStatus)
    ? (row.health_status as HealthStatus)
    : 'low';

  return {
    strain: row.strain,
    sellableFlowerGrams: sellableFlower,
    sellableSmallsGrams: sellableSmalls,
    packagedUnits: packaged,
    pipelineGrams: pipeline,
    byproductGrams: byproduct,
    totalSellableGrams: totalSellable,
    demandRevenue: demandValue,
    demandUnits,
    demandOrders,
    supplyHealth: health,
    primaryGrade: grade,
    stages: {
      binned: pipelineBinned,
      bucked: pipelineBucked,
      trimmed: sellableFlower + sellableSmalls,
      packaged,
      byproduct,
    },
  };
}

function buildSummary(strains: StrainPipelineEntry[]): PipelineSummary {
  const healthDist: Record<HealthStatus, number> = { critical: 0, low: 0, warning: 0, healthy: 0 };
  let flower = 0, smalls = 0, pkgd = 0, pipeline = 0, byproduct = 0, demandRev = 0, orders = 0, withDemand = 0;
  const st = { binned: 0, bucked: 0, trimmed: 0, packaged: 0, byproduct: 0 };

  for (const s of strains) {
    healthDist[s.supplyHealth]++;
    flower += s.sellableFlowerGrams;
    smalls += s.sellableSmallsGrams;
    pkgd += s.packagedUnits;
    pipeline += s.pipelineGrams;
    byproduct += s.byproductGrams;
    demandRev += s.demandRevenue;
    orders += s.demandOrders;
    if (s.demandRevenue > 0) withDemand++;

    st.binned += s.stages.binned;
    st.bucked += s.stages.bucked;
    st.trimmed += s.stages.trimmed;
    st.packaged += s.stages.packaged;
    st.byproduct += s.stages.byproduct;
  }

  return {
    totals: {
      sellableFlowerGrams: flower,
      sellableSmallsGrams: smalls,
      packagedUnits: pkgd,
      pipelineGrams: pipeline,
      byproductGrams: byproduct,
      totalSellableGrams: flower + smalls,
      activeDemandRevenue: demandRev,
      activeOrders: orders,
    },
    stageTotals: st,
    healthDistribution: healthDist,
    strainCount: {
      total: strains.length,
      withActiveDemand: withDemand,
      supplyOnly: strains.length - withDemand,
    },
  };
}

export function useSalesPipeline() {
  const [rows, setRows] = useState<SalesDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<GradeCode | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('revenue');

  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetailRow[]>([]);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);

  const loadData = useCallback(async () => {
    const { data, error: err } = await getSalesDashboard();
    if (err) {
      setError('Failed to load pipeline data');
    } else {
      setRows(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('sales-pipeline-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const allStrains = useMemo(() => rows.map(mapRow), [rows]);
  const summary = useMemo(() => buildSummary(allStrains), [allStrains]);

  const healthOrder: Record<HealthStatus, number> = { critical: 0, low: 1, warning: 2, healthy: 3 };

  const filteredStrains = useMemo(() => {
    let list = allStrains;
    if (healthFilter !== 'all') list = list.filter(s => s.supplyHealth === healthFilter);
    if (gradeFilter !== 'all') list = list.filter(s => s.primaryGrade === gradeFilter);

    return [...list].sort((a, b) => {
      if (sortMode === 'revenue') return b.demandRevenue - a.demandRevenue;
      if (sortMode === 'health') {
        const diff = healthOrder[a.supplyHealth] - healthOrder[b.supplyHealth];
        return diff !== 0 ? diff : b.demandRevenue - a.demandRevenue;
      }
      return a.strain.localeCompare(b.strain);
    });
  }, [allStrains, healthFilter, gradeFilter, sortMode]);

  const toggleExpanded = useCallback(async (strain: string) => {
    if (expandedStrain === strain) {
      setExpandedStrain(null);
      setBatchDetails([]);
      return;
    }

    setExpandedStrain(strain);
    setBatchDetailsLoading(true);
    const { data } = await getBatchDetails(strain);
    setBatchDetails(data || []);
    setBatchDetailsLoading(false);
  }, [expandedStrain]);

  return {
    strains: filteredStrains,
    allStrains,
    summary,
    loading,
    error,
    refresh: loadData,

    healthFilter,
    setHealthFilter,
    gradeFilter,
    setGradeFilter,
    sortMode,
    setSortMode,

    expandedStrain,
    toggleExpanded,
    batchDetails,
    batchDetailsLoading,
  };
}
