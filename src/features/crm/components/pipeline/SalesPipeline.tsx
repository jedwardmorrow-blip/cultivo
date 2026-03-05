import { useState } from 'react';
import { RefreshCw, LayoutGrid } from 'lucide-react';
import { useSalesPipeline } from '../../hooks/useSalesPipeline';
import { PipelineHeroCards } from './PipelineHeroCards';
import { PipelineCharts } from './PipelineCharts';
import { PipelineStrainTable } from './PipelineStrainTable';
import { PipelineMenuBuilder } from './PipelineMenuBuilder';
import { LoadingSpinner } from '@/shared/components';

export function SalesPipeline() {
  const {
    strains,
    allStrains,
    summary,
    loading,
    error,
    refresh,
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
  } = useSalesPipeline();

  const [showMenuBuilder, setShowMenuBuilder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-sm text-red-400">{error}</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">Inventory Pipeline</h1>
          <p className="text-[10px] text-neutral-600 font-semibold tracking-wide">
            {summary.strainCount.total} strains &middot; Real-time supply &amp; demand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMenuBuilder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Build Menu
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 text-[11px] font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <PipelineHeroCards summary={summary} />

      <PipelineCharts summary={summary} />

      <PipelineStrainTable
        strains={strains}
        healthFilter={healthFilter}
        setHealthFilter={setHealthFilter}
        gradeFilter={gradeFilter}
        setGradeFilter={setGradeFilter}
        sortMode={sortMode}
        setSortMode={setSortMode}
        expandedStrain={expandedStrain}
        onToggleExpand={toggleExpanded}
        batchDetails={batchDetails}
        batchDetailsLoading={batchDetailsLoading}
      />

      {showMenuBuilder && (
        <PipelineMenuBuilder
          strains={allStrains}
          onClose={() => setShowMenuBuilder(false)}
        />
      )}
    </div>
  );
}
