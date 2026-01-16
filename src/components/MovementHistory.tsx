import { useState, useEffect } from 'react';
import { inventoryMovementService } from '@/services/inventoryMovement.service';
import type { InventoryMovement, MovementKind } from '@/types/movement.types';
import { RefreshCw, TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react';

/**
 * Movement History Viewer
 *
 * Displays movement history for an inventory item.
 * Shows complete audit trail of all quantity changes.
 *
 * Features:
 * - Chronological movement list
 * - Visual indicators for increment/decrement
 * - Filter by movement kind
 * - Verification against current quantity
 *
 * @see docs/EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md
 */

interface MovementHistoryProps {
  itemId: string;
  packageId?: string;
}

export function MovementHistory({ itemId, packageId }: MovementHistoryProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<MovementKind | ''>('');
  const [verification, setVerification] = useState<{
    current_qty: number;
    ledger_qty: number;
    discrepancy: number;
    matches: boolean;
  } | null>(null);

  const fetchMovements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const options = kindFilter ? { movement_kind: kindFilter, limit: 100 } : { limit: 100 };
      const data = await inventoryMovementService.getMovementHistory(itemId, options);
      setMovements(data);

      // Verify quantity
      const verifyData = await inventoryMovementService.verifyInventoryQuantity(itemId);
      setVerification(verifyData);
    } catch (err) {
      console.error('Failed to fetch movements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load movements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [itemId, kindFilter]);

  const getMovementIcon = (kind: MovementKind) => {
    if (['RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE'].includes(kind)) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    }
    if (['CONSUME', 'FULFILLMENT', 'RESERVE'].includes(kind)) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getMovementColor = (kind: MovementKind) => {
    if (['RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE'].includes(kind)) {
      return 'text-green-700 bg-green-50';
    }
    if (['CONSUME', 'FULFILLMENT', 'RESERVE'].includes(kind)) {
      return 'text-red-700 bg-red-50';
    }
    return 'text-gray-700 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Movement History
          </h3>
          {packageId && (
            <p className="text-sm text-gray-600 mt-1">
              Package: {packageId}
            </p>
          )}
        </div>

        <button
          onClick={fetchMovements}
          disabled={isLoading}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Verification Status */}
      {verification && (
        <div className={`mb-4 p-4 rounded-lg border ${
          verification.matches
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {verification.matches ? (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">
                {verification.matches ? 'Ledger Verified' : 'Discrepancy Detected'}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current on_hand_qty:</span>
                  <span className="font-mono">{verification.current_qty}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ledger calculated qty:</span>
                  <span className="font-mono">{verification.ledger_qty}g</span>
                </div>
                {!verification.matches && (
                  <div className="flex justify-between font-medium">
                    <span className="text-amber-800">Discrepancy:</span>
                    <span className="font-mono text-amber-800">
                      {verification.discrepancy > 0 ? '+' : ''}{verification.discrepancy}g
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Type
        </label>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as MovementKind | '')}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Movements</option>
          <option value="RECEIPT">Receipt</option>
          <option value="CONSUME">Consume</option>
          <option value="PRODUCE">Produce</option>
          <option value="FULFILLMENT">Fulfillment</option>
          <option value="RETURN">Return</option>
          <option value="RESERVE">Reserve</option>
          <option value="RELEASE">Release</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="RECONCILIATION">Reconciliation</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Movements List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading movements...
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No movements found
          </div>
        ) : (
          movements.map((movement) => (
            <div
              key={movement.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                {getMovementIcon(movement.movement_kind)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMovementColor(movement.movement_kind)}`}>
                      {movement.movement_kind}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {movement.qty}g
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      {new Date(movement.created_at || '').toLocaleString()}
                    </div>

                    {movement.reference_type && movement.reference_id && (
                      <div>
                        Ref: {movement.reference_type} ({movement.reference_id.slice(0, 8)})
                      </div>
                    )}

                    {movement.reason_code && (
                      <div>
                        Reason: {movement.reason_code}
                      </div>
                    )}

                    {movement.notes && (
                      <div className="text-gray-500 italic">
                        {movement.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {movements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600 text-center">
          Showing {movements.length} movements
        </div>
      )}
    </div>
  );
}
