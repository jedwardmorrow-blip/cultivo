import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, RefreshCw, List, LayoutGrid } from 'lucide-react';
import { LoadingSpinner, ErrorDisplay } from '@/shared/components';
import { useInventoryPipeline, STAGES, type StageName } from '../hooks/useInventoryPipeline';
import { PipelineStrainRow } from './PipelineStrainRow';
import { formatWeight } from '@/shared/utils/format';

const STAGE_META: Record<StageName, { color: string; borderColor: string; icon: string }> = {
  Binned: { color: 'text-cult-stage-clone', borderColor: 'border-l-cult-stage-clone', icon: 'bg-cult-stage-clone/10' },
  Bucked: { color: 'text-cult-stage-harvest', borderColor: 'border-l-cult-stage-harvest', icon: 'bg-cult-stage-harvest/10' },
  Trimmed: { color: 'text-cult-stage-veg', borderColor: 'border-l-cult-stage-veg', icon: 'bg-cult-stage-veg/10' },
  Packaged: { color: 'text-cult-success', borderColor: 'border-l-cult-success', icon: 'bg-cult-success/10' },
};

export function InventoryPipelineWidget() {
  const navigate = useNavigate();
  const { strains, grandTotals, loading, error, refresh } = useInventoryPipeline();
  const [viewMode, setViewMode] = useState<'strain' | 'batch'>('strain');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  const allBatches = strains.flatMap(s =>
    s.batches.map(b => ({ ...b, strain: s.strain }))
  ).sort((a, b) => a.batchNumber.localeCompare(b.batchNumber));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-cult-green" />
          <div>
            <h2 className="text-lg font-semibold text-cult-text-primary uppercase tracking-wide">Inventory Pipeline</h2>
            <p className="text-xs text-cult-text-muted mt-0.5">Production stage overview across all strains</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-cult-black border border-cult-border">
            <button
              onClick={() => setViewMode('strain')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                viewMode === 'strain'
                  ? 'bg-cult-border/40 text-cult-text-primary'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              Strain
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                viewMode === 'batch'
                  ? 'bg-cult-border/40 text-cult-text-primary'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              <List className="w-3 h-3" />
              Batch
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 text-cult-text-muted hover:text-cult-text-primary transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stage Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAGES.map(stage => {
          const meta = STAGE_META[stage];
          const data = grandTotals.stages[stage];
          const isPackaged = stage === 'Packaged';
          const primaryValue = isPackaged ? `${data.units.toLocaleString()} units` : formatWeight(data.weight);
          const secondaryValue = `${data.items} items`;

          return (
            <div
              key={stage}
              className={`bg-cult-black p-4 border border-cult-border border-l-4 ${meta.borderColor}`}
            >
              <p className="text-xs text-cult-text-muted uppercase tracking-wider mb-1">{stage}</p>
              <p className={`text-xl font-bold ${meta.color} tabular-nums`}>{primaryValue}</p>
              <p className="text-xs text-cult-border mt-0.5">{secondaryValue}</p>
            </div>
          );
        })}
      </div>

      {/* Matrix Table */}
      {strains.length === 0 ? (
        <div className="bg-cult-black border border-cult-border p-12 text-center">
          <p className="text-cult-text-muted">No inventory data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-cult-border">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-cult-text-muted uppercase tracking-wider w-[200px]">
                  {viewMode === 'strain' ? 'Strain' : 'Batch'}
                </th>
                {STAGES.map(stage => (
                  <th key={stage} className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ minWidth: 90 }}>
                    <span className={STAGE_META[stage].color}>{stage}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewMode === 'strain' ? (
                strains.map(strain => (
                  <PipelineStrainRow
                    key={strain.strain}
                    strain={strain}
                    grandTotals={grandTotals}
                    onNavigateToInventory={() => navigate('/inventory-all')}
                  />
                ))
              ) : (
                allBatches.map(batch => (
                  <tr key={batch.batchId} className="border-b border-cult-border/50 hover:bg-cult-surface/80">
                    <td className="px-3 py-2.5">
                      <div>
                        <span className="text-sm font-mono text-cult-text-primary">{batch.batchNumber}</span>
                        <span className="text-xs text-cult-border ml-2">{batch.strain}</span>
                      </div>
                    </td>
                    {STAGES.map(stage => {
                      const d = batch.stages[stage];
                      const isPackaged = stage === 'Packaged';
                      const value = isPackaged ? d.units : d.weight;
                      const display = isPackaged
                        ? (d.units > 0 ? `${d.units.toLocaleString()}u` : '')
                        : (d.weight > 0 ? formatWeight(d.weight) : '');

                      const max = grandTotals.maxByStage[stage];
                      const opacity = max > 0 && value > 0 ? Math.max(0.08, (value / max) * 0.35) : 0;
                      const bgColor = stage === 'Binned' ? 'bg-cult-stage-clone' : stage === 'Bucked' ? 'bg-cult-stage-harvest' : stage === 'Trimmed' ? 'bg-cult-stage-veg' : 'bg-cult-success';

                      return (
                        <td key={stage} className="px-3 py-2.5 text-right relative">
                          {opacity > 0 && <div className={`absolute inset-0 ${bgColor}`} style={{ opacity }} />}
                          <span className={`relative z-10 text-sm tabular-nums ${display ? 'text-cult-text-primary font-medium' : 'text-cult-border'}`}>
                            {display || '\u2014'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-cult-border bg-cult-black/40">
                <td className="px-3 py-2.5 text-xs font-semibold text-cult-text-muted uppercase tracking-wider">Total</td>
                {STAGES.map(stage => {
                  const d = grandTotals.stages[stage];
                  const isPackaged = stage === 'Packaged';
                  const display = isPackaged
                    ? `${d.units.toLocaleString()}u`
                    : formatWeight(d.weight);
                  return (
                    <td key={stage} className="px-3 py-2.5 text-right">
                      <span className={`text-sm font-bold tabular-nums ${STAGE_META[stage].color}`}>{display}</span>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
