import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, TrendingUp, Settings } from 'lucide-react';
import { batchService } from '@/services';
import type { BatchAllocationWarning } from '../../types';

export function BatchOverAllocationWidget() {
  const navigate = useNavigate();
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
        <div className="h-8 bg-cult-surface-overlay rounded-cult mb-4 w-1/3"></div>
        <div className="space-y-3">
          <div className="h-20 bg-cult-surface-overlay rounded-cult"></div>
          <div className="h-20 bg-cult-surface-overlay rounded-cult"></div>
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
          <h2 className="text-xs font-semibold text-cult-text-primary uppercase tracking-[1.5px]">
            Critical Over-Allocations
          </h2>
          {warnings.length > 0 && (
            <span className="px-2.5 py-0.5 bg-cult-danger-muted text-cult-danger border border-cult-danger rounded-cult text-xs font-bold">
              {warnings.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-3 py-2 border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-all text-[0.625rem] uppercase tracking-wider rounded-cult"
        >
          <Settings className="w-3.5 h-3.5" />
          Manage Batches
        </button>
      </div>

      {warnings.length === 0 ? (
        <div className="bg-cult-surface-raised border border-cult-success/30 rounded-cult p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-cult-success" />
            <h3 className="text-sm font-semibold text-cult-success uppercase tracking-wide">
              All Systems Normal
            </h3>
          </div>
          <p className="text-cult-text-muted text-xs">
            No batches are critically over-allocated. All inventory allocations are within safe limits.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
            {displayWarnings.map((warning, idx) => (
              <div
                key={`${warning.batch_id}-${warning.stage}-${idx}`}
                className="bg-cult-surface-raised border border-cult-danger rounded-cult p-4 hover:border-cult-danger/80 transition-all cursor-pointer group"
                onClick={() => navigate('/settings')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-cult-danger flex-shrink-0" />
                    <div>
                      <h4 className="text-sm text-cult-text-primary font-semibold group-hover:text-cult-danger transition-colors">
                        {warning.batch_number}
                      </h4>
                      <p className="text-[0.6875rem] text-cult-text-muted">{warning.strain}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-cult-danger-muted text-cult-danger border border-cult-danger rounded-cult text-[0.625rem] font-bold uppercase">
                    {warning.stage}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem] text-cult-text-muted uppercase tracking-wider">
                      Allocation
                    </span>
                    <span className="text-xs font-bold text-cult-danger">
                      {warning.allocation_percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-cult-surface-overlay h-1.5 rounded-full relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-cult-danger rounded-full"
                      style={{ width: `${Math.min(warning.allocation_percentage, 200)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem] text-cult-text-muted">Over-allocated:</span>
                    <span className="text-xs font-bold text-cult-danger">
                      {warning.over_allocation_grams.toFixed(1)}g
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-cult-border">
                  <p className="text-[0.6875rem] text-cult-text-muted">{warning.message}</p>
                </div>
              </div>
            ))}
          </div>

          {hasMoreWarnings && (
            <div className="bg-cult-surface-raised border border-cult-danger rounded-cult p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cult-danger" />
                  <span className="text-xs text-cult-text-muted">
                    {warnings.length - 5} more critical over-allocations require attention
                  </span>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 bg-cult-danger text-cult-text-primary hover:bg-cult-danger/80 transition-all text-[0.625rem] uppercase tracking-wider font-bold rounded-cult"
                >
                  View All
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 bg-cult-surface-raised border border-cult-warning rounded-cult p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cult-warning flex-shrink-0 mt-0.5" />
              <div className="text-[0.6875rem] text-cult-text-muted">
                <strong className="text-cult-warning">Action Required:</strong> These batches are critically over-allocated (&ge;120%).
                Review allocations and adjust orders or increase inventory to resolve.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
