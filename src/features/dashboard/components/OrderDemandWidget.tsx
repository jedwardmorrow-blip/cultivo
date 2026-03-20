import { useEffect, useState } from 'react';
import { Package, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { batchAllocationService } from '@/services';
import type { ProjectedInventoryRequirement } from '../../features/batches/services/batchAllocation.service';

export function OrderDemandWidget() {
  const [requirements, setRequirements] = useState<ProjectedInventoryRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrain, setSelectedStrain] = useState<string>('all');

  useEffect(() => {
    loadRequirements();
  }, []);

  async function loadRequirements() {
    try {
      setLoading(true);
      const data = await batchAllocationService.fetchProjectedInventoryRequirements();
      setRequirements(data);
    } catch (error) {
      console.error('Error loading inventory requirements:', error);
    } finally {
      setLoading(false);
    }
  }

  const strains = Array.from(new Set(requirements.map(r => r.strain))).sort();
  const filteredRequirements = selectedStrain === 'all'
    ? requirements
    : requirements.filter(r => r.strain === selectedStrain);

  const totalUnitsNeeded = filteredRequirements.reduce((sum, r) => sum + r.total_units_needed, 0);
  const totalPackagedAvailable = filteredRequirements.reduce((sum, r) => sum + r.packaged_units_available, 0);
  const totalUnitsShortfall = filteredRequirements.reduce((sum, r) => sum + r.units_still_needed, 0);

  if (loading) {
    return (
      <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-cult-light-gray">Loading order demand...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult">
      <div className="border-b border-cult-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-cult-white" />
            <h3 className="text-xl font-bold text-cult-white uppercase tracking-wider">
              Order Demand Overview
            </h3>
          </div>
          <select
            value={selectedStrain}
            onChange={(e) => setSelectedStrain(e.target.value)}
            className="px-4 py-2 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
          >
            <option value="all">All Strains</option>
            {strains.map(strain => (
              <option key={strain} value={strain}>{strain}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-cult-surface-overlay border border-cult-border rounded-cult p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">Total Demand</span>
            </div>
            <div className="text-2xl font-bold text-cult-white">{totalUnitsNeeded}</div>
            <div className="text-xs text-cult-light-gray mt-1">units needed</div>
          </div>

          <div className="bg-cult-surface-overlay border border-cult-border rounded-cult p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">Packaged</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{totalPackagedAvailable}</div>
            <div className="text-xs text-cult-light-gray mt-1">
              {totalUnitsNeeded > 0
                ? `${Math.round((totalPackagedAvailable / totalUnitsNeeded) * 100)}% ready`
                : '0% ready'
              }
            </div>
          </div>

          <div className="bg-cult-surface-overlay border border-cult-border rounded-cult p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">Still Needed</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{totalUnitsShortfall}</div>
            <div className="text-xs text-cult-light-gray mt-1">to package</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredRequirements.length === 0 ? (
            <div className="text-center py-8 text-cult-lighter-gray">
              No pending orders with inventory requirements
            </div>
          ) : (
            filteredRequirements.map((req, idx) => (
              <div
                key={idx}
                className="bg-cult-surface-overlay border border-cult-border rounded-cult p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-cult-white font-bold">{req.product_name}</h4>
                    <div className="text-sm text-cult-light-gray mt-1">
                      {req.strain} • {req.order_count} order{req.order_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-cult-white">
                      {req.total_units_needed} units
                    </div>
                    {req.earliest_delivery_date && (
                      <div className="text-xs text-cult-lighter-gray mt-1">
                        Due: {new Date(req.earliest_delivery_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-cult-border">
                  <div>
                    <div className="text-xs text-cult-lighter-gray mb-1">Packaged</div>
                    <div className={`font-bold ${
                      req.packaged_units_available >= req.total_units_needed
                        ? 'text-green-400'
                        : 'text-amber-400'
                    }`}>
                      {req.packaged_units_available} units
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-cult-lighter-gray mb-1">Bulk Available</div>
                    <div className="text-cult-white font-bold">
                      {req.bulk_grams_available.toFixed(0)}g
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-cult-lighter-gray mb-1">Bucked Needed</div>
                    <div className={`font-bold ${
                      req.bucked_grams_needed > 0 ? 'text-cult-danger' : 'text-cult-success'
                    }`}>
                      {req.bucked_grams_needed.toFixed(0)}g
                    </div>
                  </div>
                </div>

                {req.units_still_needed > 0 && (
                  <div className="mt-3 p-2 bg-amber-900/20 border border-amber-700">
                    <div className="flex items-center gap-2 text-xs text-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        Need {req.units_still_needed} more units
                        {req.grams_needed_from_bulk > 0 &&
                          ` (${req.grams_needed_from_bulk.toFixed(0)}g from bulk)`
                        }
                      </span>
                    </div>
                  </div>
                )}

                {req.packaged_units_available >= req.total_units_needed && (
                  <div className="mt-3 p-2 bg-green-900/20 border border-green-700">
                    <div className="flex items-center gap-2 text-xs text-green-200">
                      <CheckCircle className="w-3 h-3" />
                      <span>Fully stocked and ready for delivery</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
