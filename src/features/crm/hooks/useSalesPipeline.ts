import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getPipelineStages,
  getActiveDemand,
  getInventoryByCategory,
  getBatchGrades,
  getBatchDetails,
  type PipelineStageRow,
  type DemandRow,
  type InventoryCategoryRow,
  type BatchGradeRow,
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

function classifyCategory(category: string): 'flower' | 'smalls' | 'trim' | 'other' {
  const c = category.toLowerCase();
  if (c.includes('smalls')) return 'smalls';
  if (c.includes('trim')) return 'trim';
  if (c.includes('flower')) return 'flower';
  return 'other';
}

function classifyStage(category: string): 'binned' | 'bucked' | 'bulk' | 'packaged' | null {
  const c = category.toLowerCase();
  if (c.includes('packaged')) return 'packaged';
  if (c.includes('bulk')) return 'bulk';
  if (c.includes('bucked')) return 'bucked';
  if (c.includes('binned')) return 'binned';
  return null;
}

function computeSupplyHealth(
  totalSellable: number,
  pipelineGrams: number,
  demandRevenue: number,
  demandUnits: number
): HealthStatus {
  if (demandRevenue === 0 && demandUnits === 0) {
    return totalSellable > 0 || pipelineGrams > 0 ? 'healthy' : 'critical';
  }

  const demandGramsEstimate = demandUnits * 3.5;
  const supplyGrams = totalSellable + pipelineGrams * 0.15;

  if (totalSellable === 0 && pipelineGrams === 0) return 'critical';
  if (supplyGrams < demandGramsEstimate * 0.3) return 'critical';
  if (supplyGrams < demandGramsEstimate * 0.7) return 'low';
  if (supplyGrams < demandGramsEstimate * 1.2) return 'warning';
  return 'healthy';
}

function determinePrimaryGrade(gradeRows: BatchGradeRow[], strain: string): GradeCode {
  const strainGrades = gradeRows.filter(r => r.strain === strain);
  if (strainGrades.length === 0) return 'UNDEFINED';

  const gradePriority: GradeCode[] = ['CULT', 'B', 'C', 'D', 'UNDEFINED'];
  let maxCount = 0;
  let primaryGrade: GradeCode = 'UNDEFINED';

  for (const prio of gradePriority) {
    const match = strainGrades.find(r => r.grade_code === prio);
    if (match && match.batch_count > maxCount) {
      maxCount = match.batch_count;
      primaryGrade = prio;
    }
  }

  return primaryGrade;
}

function transformData(
  stageRows: PipelineStageRow[],
  demandRows: DemandRow[],
  categoryRows: InventoryCategoryRow[],
  gradeRows: BatchGradeRow[]
): { strains: StrainPipelineEntry[]; summary: PipelineSummary } {
  const allStrains = new Set<string>();

  for (const r of stageRows) allStrains.add(r.strain);
  for (const r of demandRows) if (r.strain) allStrains.add(r.strain);
  for (const r of categoryRows) allStrains.add(r.strain);

  const demandMap = new Map<string, DemandRow>();
  for (const r of demandRows) {
    if (r.strain) demandMap.set(r.strain, r);
  }

  const catMap = new Map<string, InventoryCategoryRow[]>();
  for (const r of categoryRows) {
    if (!catMap.has(r.strain)) catMap.set(r.strain, []);
    catMap.get(r.strain)!.push(r);
  }

  const stageMap = new Map<string, { binned: number; bucked: number; trimmed: number; packaged: number }>();
  for (const r of stageRows) {
    if (!stageMap.has(r.strain)) {
      stageMap.set(r.strain, { binned: 0, bucked: 0, trimmed: 0, packaged: 0 });
    }
    const entry = stageMap.get(r.strain)!;
    const stage = r.stage?.toLowerCase() as keyof typeof entry;
    if (stage in entry) {
      if (stage === 'packaged') {
        entry[stage] += Number(r.unit_count) || 0;
      } else {
        entry[stage] += Number(r.weight_grams) || 0;
      }
    }
  }

  const strains: StrainPipelineEntry[] = [];

  for (const strain of allStrains) {
    const cats = catMap.get(strain) || [];
    const demand = demandMap.get(strain);
    const stages = stageMap.get(strain) || { binned: 0, bucked: 0, trimmed: 0, packaged: 0 };

    let sellableFlowerGrams = 0;
    let sellableSmallsGrams = 0;
    let byproductGrams = 0;

    for (const cat of cats) {
      const type = classifyCategory(cat.category);
      const catStage = classifyStage(cat.category);

      if (type === 'trim') {
        byproductGrams += cat.total_qty;
      } else if (type === 'flower' && (catStage === 'bulk' || catStage === 'packaged')) {
        sellableFlowerGrams += catStage === 'packaged' ? 0 : cat.total_qty;
      } else if (type === 'smalls' && (catStage === 'bulk' || catStage === 'packaged')) {
        sellableSmallsGrams += cat.total_qty;
      }
    }

    const packagedUnits = stages.packaged;
    const pipelineGrams = stages.binned + stages.bucked;
    const totalSellableGrams = sellableFlowerGrams + sellableSmallsGrams;

    const supplyHealth = computeSupplyHealth(
      totalSellableGrams,
      pipelineGrams,
      demand?.total_revenue || 0,
      demand?.total_qty || 0
    );

    const primaryGrade = determinePrimaryGrade(gradeRows, strain);

    strains.push({
      strain,
      sellableFlowerGrams,
      sellableSmallsGrams,
      packagedUnits,
      pipelineGrams,
      byproductGrams,
      totalSellableGrams,
      demandRevenue: demand?.total_revenue || 0,
      demandUnits: demand?.total_qty || 0,
      demandOrders: demand?.order_count || 0,
      supplyHealth,
      primaryGrade,
      stages: {
        binned: stages.binned,
        bucked: stages.bucked,
        trimmed: sellableFlowerGrams + sellableSmallsGrams,
        packaged: packagedUnits,
        byproduct: byproductGrams,
      },
    });
  }

  const healthDist: Record<HealthStatus, number> = { critical: 0, low: 0, warning: 0, healthy: 0 };
  let totSellableFlower = 0, totSellableSmalls = 0, totPackaged = 0;
  let totPipeline = 0, totByproduct = 0, totDemandRev = 0;
  const orderIds = new Set<string>();
  let withDemand = 0;

  const stBinned = { binned: 0, bucked: 0, trimmed: 0, packaged: 0, byproduct: 0 };

  for (const s of strains) {
    healthDist[s.supplyHealth]++;
    totSellableFlower += s.sellableFlowerGrams;
    totSellableSmalls += s.sellableSmallsGrams;
    totPackaged += s.packagedUnits;
    totPipeline += s.pipelineGrams;
    totByproduct += s.byproductGrams;
    totDemandRev += s.demandRevenue;
    if (s.demandRevenue > 0) withDemand++;

    stBinned.binned += s.stages.binned;
    stBinned.bucked += s.stages.bucked;
    stBinned.trimmed += s.stages.trimmed;
    stBinned.packaged += s.stages.packaged;
    stBinned.byproduct += s.stages.byproduct;
  }

  let totalActiveOrders = 0;
  for (const d of demandRows) totalActiveOrders += d.order_count;

  return {
    strains,
    summary: {
      totals: {
        sellableFlowerGrams: totSellableFlower,
        sellableSmallsGrams: totSellableSmalls,
        packagedUnits: totPackaged,
        pipelineGrams: totPipeline,
        byproductGrams: totByproduct,
        totalSellableGrams: totSellableFlower + totSellableSmalls,
        activeDemandRevenue: totDemandRev,
        activeOrders: totalActiveOrders,
      },
      stageTotals: stBinned,
      healthDistribution: healthDist,
      strainCount: {
        total: strains.length,
        withActiveDemand: withDemand,
        supplyOnly: strains.length - withDemand,
      },
    },
  };
}

export function useSalesPipeline() {
  const [stageRows, setStageRows] = useState<PipelineStageRow[]>([]);
  const [demandRows, setDemandRows] = useState<DemandRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<InventoryCategoryRow[]>([]);
  const [gradeRows, setGradeRows] = useState<BatchGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<GradeCode | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('revenue');

  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetailRow[]>([]);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [stageRes, demandRes, catRes, gradeRes] = await Promise.all([
      getPipelineStages(),
      getActiveDemand(),
      getInventoryByCategory(),
      getBatchGrades(),
    ]);

    if (stageRes.error || demandRes.error || catRes.error || gradeRes.error) {
      setError('Failed to load pipeline data');
    } else {
      setStageRows(stageRes.data || []);
      setDemandRows(demandRes.data || []);
      setCategoryRows(catRes.data || []);
      setGradeRows(gradeRes.data || []);
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

  const { strains: allStrains, summary } = useMemo(
    () => transformData(stageRows, demandRows, categoryRows, gradeRows),
    [stageRows, demandRows, categoryRows, gradeRows]
  );

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
