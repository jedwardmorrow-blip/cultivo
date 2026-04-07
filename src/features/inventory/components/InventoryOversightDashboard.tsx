import { RefreshCw, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useInventoryOversight } from '../hooks/useInventoryOversight';
import { LoadingSpinner } from '@/shared/components';

export function InventoryOversightDashboard() {
  const { requirements, loading, error, reload } = useInventoryOversight();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-cult-danger-muted border border-cult-danger p-4 text-cult-danger">
        <p className="font-semibold">Error Loading Inventory Requirements</p>
        <p className="text-sm mt-1">{error.message}</p>
        <button
          onClick={reload}
          className="mt-2 px-4 py-2 bg-cult-danger-muted border border-cult-danger hover:bg-cult-danger/30 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const getStatusColor = (requirement: typeof requirements[0]) => {
    if (requirement.units_still_needed <= 0) {
      return 'green';
    }
    if (requirement.packaged_units_available > 0 || requirement.bulk_grams_available > 0) {
      return 'yellow';
    }
    return 'red';
  };

  const getStatusIcon = (requirement: typeof requirements[0]) => {
    const status = getStatusColor(requirement);
    if (status === 'green') {
      return <CheckCircle className="w-5 h-5 text-cult-success" />;
    }
    if (status === 'yellow') {
      return <Package className="w-5 h-5 text-cult-warning" />;
    }
    return <AlertTriangle className="w-5 h-5 text-cult-danger" />;
  };

  const groupedByStrain = requirements.reduce((acc, req) => {
    if (!acc[req.strain]) {
      acc[req.strain] = [];
    }
    acc[req.strain].push(req);
    return acc;
  }, {} as Record<string, typeof requirements>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
          Inventory Oversight
        </h2>
        <button
          onClick={reload}
          className="flex items-center gap-2 px-4 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all text-sm uppercase tracking-wider"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="bg-cult-black border border-cult-medium-gray p-8 text-center">
          <p className="text-cult-light-gray">No active orders requiring inventory</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByStrain).map(([strain, items]) => (
            <div key={strain} className="bg-cult-black border border-cult-medium-gray">
              <div className="bg-cult-near-black border-b border-cult-medium-gray px-4 py-3">
                <h3 className="text-lg font-bold text-cult-white uppercase tracking-wide">
                  {strain}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-cult-near-black text-cult-light-gray text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Total Needed</th>
                      <th className="px-4 py-3 text-right">Packaged Available</th>
                      <th className="px-4 py-3 text-right">Still Needed</th>
                      <th className="px-4 py-3 text-right">Bulk Available (g)</th>
                      <th className="px-4 py-3 text-right">Bucked Needed (g)</th>
                      <th className="px-4 py-3 text-right">Orders</th>
                      <th className="px-4 py-3 text-left">Earliest Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cult-medium-gray">
                    {items.map((req, idx) => {
                      const statusColor = getStatusColor(req);
                      return (
                        <tr key={idx} className="hover:bg-cult-near-black transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {getStatusIcon(req)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-cult-white font-medium">
                            {req.product_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-cult-light-gray capitalize">
                            {req.product_category}
                          </td>
                          <td className="px-4 py-3 text-sm text-cult-white text-right font-bold">
                            {req.total_units_needed}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            req.packaged_units_available > 0 ? 'text-cult-success' : 'text-cult-light-gray'
                          }`}>
                            {req.packaged_units_available}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-bold ${
                            statusColor === 'green' ? 'text-cult-success' :
                            statusColor === 'yellow' ? 'text-cult-warning' :
                            'text-cult-danger'
                          }`}>
                            {req.units_still_needed > 0 ? req.units_still_needed : 0}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            req.bulk_grams_available > 0 ? 'text-cult-info' : 'text-cult-light-gray'
                          }`}>
                            {req.bulk_grams_available.toFixed(1)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            req.bucked_grams_needed > 0 ? 'text-cult-warning' : 'text-cult-light-gray'
                          }`}>
                            {req.bucked_grams_needed.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-sm text-cult-light-gray text-right">
                            {req.order_count}
                          </td>
                          <td className="px-4 py-3 text-sm text-cult-light-gray">
                            {req.earliest_delivery_date
                              ? new Date(req.earliest_delivery_date).toLocaleDateString()
                              : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-cult-black border border-cult-medium-gray p-4">
        <h3 className="text-sm font-bold text-cult-white uppercase tracking-wider mb-3">
          Legend
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-cult-success" />
            <span className="text-cult-light-gray">Fully Stocked - All inventory available</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cult-warning" />
            <span className="text-cult-light-gray">Partial - Some processing needed</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cult-danger" />
            <span className="text-cult-light-gray">Shortage - Insufficient inventory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
