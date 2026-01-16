import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Settings } from 'lucide-react';
import { batchService } from '@/services';
import type { BatchAllocationWarning } from '../../types';

interface BatchOverAllocationWidgetProps {
  onViewChange: (view: string) => void;
}

export function BatchOverAllocationWidget({ onViewChange }: BatchOverAllocationWidgetProps) {
  const [warnings, setWarnings] = useState<BatchAllocationWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverAllocations();
    const interval = setInterval(loadOverAllocations, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadOverAllocations() {
    try {
      const allWarnings = await batchService.fetchOverAllocatedBatches();
      const criticalWarnings = allWarnings.filter(w => w.allocation_percentage >= 120);
      setWarnings(criticalWarnings);
    } catch (error) {
      console.error('Error loading over-allocation warnings:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-cult-medium-gray mb-4 w-1/3"></div>
        <div className="space-y-3">
          <div className="h-20 bg-cult-medium-gray"></div>
          <div className="h-20 bg-cult-medium-gray"></div>
        </div>
      </div>
    );
  }

  const displayWarnings = warnings.slice(0, 5);
  const hasMoreWarnings = warnings.length > 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
            Critical Over-Allocations
          </h2>
          {warnings.length > 0 && (
            <span className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-600 text-sm font-bold">
              {warnings.length}
            </span>
          )}
        </div>
        <button
          onClick={() => onViewChange('settings')}
          className="flex items-center gap-2 px-3 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all text-xs uppercase tracking-wider"
        >
          <Settings className="w-4 h-4" />
          Manage Batches
        </button>
      </div>

      {warnings.length === 0 ? (
        <div className="bg-cult-black border border-green-600 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-bold text-green-400 uppercase tracking-wide">
              All Systems Normal
            </h3>
          </div>
          <p className="text-cult-light-gray text-sm">
            No batches are critically over-allocated. All inventory allocations are within safe limits.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {displayWarnings.map((warning, idx) => (
              <div
                key={`${warning.batch_id}-${warning.stage}-${idx}`}
                className="bg-cult-black border border-red-600 p-4 hover:bg-cult-near-black transition-all cursor-pointer group"
                onClick={() => onViewChange('settings')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-cult-white font-bold group-hover:text-red-400 transition-colors">
                        {warning.batch_number}
                      </h4>
                      <p className="text-xs text-cult-lighter-gray">{warning.strain}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-900/30 text-red-400 border border-red-600 text-xs font-bold uppercase">
                    {warning.stage}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">
                      Allocation
                    </span>
                    <span className="text-sm font-bold text-red-400">
                      {warning.allocation_percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-cult-near-black h-2 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-red-600"
                      style={{ width: `${Math.min(warning.allocation_percentage, 200)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cult-lighter-gray">Over-allocated:</span>
                    <span className="text-sm font-bold text-red-400">
                      {warning.over_allocation_grams.toFixed(1)}g
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-cult-medium-gray">
                  <p className="text-xs text-red-300">{warning.message}</p>
                </div>
              </div>
            ))}
          </div>

          {hasMoreWarnings && (
            <div className="bg-cult-near-black border border-red-600 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300">
                    {warnings.length - 5} more critical over-allocations require attention
                  </span>
                </div>
                <button
                  onClick={() => onViewChange('settings')}
                  className="px-4 py-2 bg-red-600 text-cult-white hover:bg-red-700 transition-all text-xs uppercase tracking-wider font-bold"
                >
                  View All
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 bg-cult-near-black border border-amber-600 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <strong className="text-amber-400">Action Required:</strong> These batches are critically over-allocated (≥120%).
                Review allocations and adjust orders or increase inventory to resolve.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
