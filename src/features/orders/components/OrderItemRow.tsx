import { useState, useEffect } from 'react';
import { CreditCard as Edit2, Trash2, Package, CheckCircle, AlertCircle, Circle, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { PackageAssignmentModal } from './PackageAssignmentModal';
import { AssignedPackagesDisplay } from './AssignedPackagesDisplay';
import { OrderItemLabelPrintModal } from './OrderItemLabelPrintModal';
import { useTotalAssignedQuantity } from '../hooks';
import { useOrderItemLabels } from '../hooks/useOrderItemLabels';
import { fulfillmentValidationService } from '../services/fulfillmentValidation.service';
import type { FulfillmentStatus } from '../types';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  product_name: string;
  product_type: string;
  strain: string;
  status: string;
  pricing_unit?: string;
  product_category?: string;
  batch_id?: string | null;
}

interface BatchInfo {
  batch_id: string;
  batch_number: string;
  strain: string;
  status: string;
  has_bucked: boolean;
  has_bulk_flower: boolean;
  has_bulk_smalls: boolean;
  has_bulk_trim: boolean;
  has_packaged: boolean;
  total_available_grams: number;
}

interface OrderItemRowProps {
  item: OrderItem;
  orderId: string;
  onStatusUpdate: (itemId: string, orderId: string, newStatus: string) => void;
  onQuantityUpdate: (itemId: string, orderId: string, newQuantity: number) => void;
  onPriceUpdate: (itemId: string, orderId: string, newPrice: number) => void;
  onBatchUpdate: (itemId: string, orderId: string, batchId: string | null, strain: string | null) => void;
  onDelete: (itemId: string, orderId: string) => void;
}

export function OrderItemRow({
  item,
  orderId,
  onStatusUpdate,
  onQuantityUpdate,
  onPriceUpdate,
  onBatchUpdate,
  onDelete,
}: OrderItemRowProps) {
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [quantityValue, setQuantityValue] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const [availableBatches, setAvailableBatches] = useState<BatchInfo[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAssignedPackages, setShowAssignedPackages] = useState(false);
  const [showLabelPrintModal, setShowLabelPrintModal] = useState(false);

  const { totalAssigned, loading: loadingAssigned } = useTotalAssignedQuantity(item.id);
  const { labels, stats, loading: labelsLoading } = useOrderItemLabels(item.id);

  const remainingToAssign = item.quantity - totalAssigned;
  const isFullyAssigned = remainingToAssign === 0;
  const isPartiallyAssigned = totalAssigned > 0 && totalAssigned < item.quantity;

  const fulfillmentPercentage = item.quantity > 0 ? (totalAssigned / item.quantity) * 100 : 0;

  let fulfillmentStatus: FulfillmentStatus = 'unfulfilled';
  if (isFullyAssigned) {
    fulfillmentStatus = 'fully_fulfilled';
  } else if (isPartiallyAssigned) {
    fulfillmentStatus = 'partially_fulfilled';
  }

  const statusColor = fulfillmentValidationService.getFulfillmentStatusColor(fulfillmentStatus);
  const statusBadgeColor = fulfillmentValidationService.getFulfillmentStatusBadgeColor(fulfillmentStatus);

  useEffect(() => {
    if (!item.strain) return;

    let cancelled = false;
    setBatchesLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_batches_for_strain', { p_strain: item.strain });

        if (cancelled) return;

        if (error) {
          console.error('[OrderItemRow] Error loading batches for strain:', item.strain, error);
          setAvailableBatches([]);
        } else {
          setAvailableBatches(data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[OrderItemRow] Exception loading batches:', error);
          setAvailableBatches([]);
        }
      } finally {
        if (!cancelled) {
          setBatchesLoading(false);
          setBatchesLoaded(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [item.strain]);

  const startEditingQuantity = () => {
    setEditingQuantity(true);
    setQuantityValue(item.quantity.toString());
  };

  const saveQuantity = () => {
    const newValue = parseInt(quantityValue);
    if (!isNaN(newValue) && newValue > 0) {
      onQuantityUpdate(item.id, orderId, newValue);
    }
    setEditingQuantity(false);
  };

  const startEditingPrice = () => {
    setEditingPrice(true);
    setPriceValue(item.unit_price.toString());
  };

  const savePrice = () => {
    const newValue = parseFloat(priceValue);
    if (!isNaN(newValue) && newValue > 0) {
      onPriceUpdate(item.id, orderId, newValue);
    }
    setEditingPrice(false);
  };

  return (
    <>
      <tr className="hover:bg-cult-dark-gray transition-colors">
        <td className="px-3 py-3 text-sm font-medium text-cult-white">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 max-w-[200px]">
              {item.product_category === 'bulk' && <span className="text-xs">🔲</span>}
              {item.product_category === 'preroll' && <span className="text-xs">🚬</span>}
              {item.product_category === 'packaged' && <span className="text-xs">📦</span>}
              <span className="truncate" title={item.product_name}>{item.product_name}</span>
            </div>
            {!loadingAssigned && totalAssigned > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAssignedPackages(!showAssignedPackages)}
                  className={`text-xs hover:opacity-80 text-left flex items-center gap-1 ${statusColor}`}
                >
                  {isFullyAssigned ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : isPartiallyAssigned ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                  {totalAssigned} of {item.quantity} {item.pricing_unit || 'units'} assigned ({fulfillmentPercentage.toFixed(0)}%)
                  {showAssignedPackages ? ' ▼' : ' ▶'}
                </button>
                <div className="w-24 h-1.5 bg-cult-medium-gray rounded-full overflow-hidden">
                  <div
                    className={`h-full ${statusBadgeColor} transition-all`}
                    style={{ width: `${Math.min(fulfillmentPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!labelsLoading && stats.total > 0 && (
              <div className="flex items-center gap-2">
                <span className={`text-xs flex items-center gap-1 ${
                  stats.pending === 0 ? 'text-green-400' :
                  stats.printed > 0 ? 'text-yellow-400' :
                  'text-cult-lighter-gray'
                }`}>
                  {stats.printed} of {stats.total} labels printed
                </span>
                <div className="w-24 h-1.5 bg-cult-medium-gray rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      stats.pending === 0 ? 'bg-green-500' :
                      stats.printed > 0 ? 'bg-yellow-500' :
                      'bg-cult-lighter-gray'
                    }`}
                    style={{ width: `${stats.total > 0 ? (stats.printed / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </td>
      <td className="px-3 py-3 text-sm text-cult-light-gray whitespace-nowrap">
        {item.strain || '-'}
      </td>
      <td className="px-3 py-3 text-sm">
        <select
          value={item.batch_id || ''}
          onChange={(e) => onBatchUpdate(item.id, orderId, e.target.value || null, item.strain)}
          disabled={!item.strain || batchesLoading}
          className={`px-2 py-1 text-xs border-2 bg-cult-dark-gray text-cult-white focus:outline-none focus:border-cult-white font-medium w-28 ${
            !item.batch_id ? 'border-yellow-600 text-yellow-400' : 'border-cult-medium-gray'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">
            {!item.strain ? 'No strain selected' : batchesLoading ? 'Loading batches...' : 'No Batch Assigned'}
          </option>
          {availableBatches.map(batch => (
            <option key={batch.batch_id} value={batch.batch_id}>
              {batch.batch_number}
            </option>
          ))}
        </select>
        {!item.strain && (
          <p className="text-xs text-red-500 mt-1">Product missing strain</p>
        )}
        {item.strain && !item.batch_id && batchesLoaded && availableBatches.length > 0 && (
          <p className="text-xs text-yellow-500 mt-1">Assign batch to track</p>
        )}
        {item.strain && batchesLoaded && availableBatches.length === 0 && (
          <p className="text-xs text-orange-500 mt-1">No batches available for {item.strain}</p>
        )}
      </td>
      <td className="px-3 py-3 text-sm font-bold text-cult-white text-right whitespace-nowrap">
        {editingQuantity ? (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              step="1"
              min="1"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              onBlur={saveQuantity}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveQuantity();
                if (e.key === 'Escape') setEditingQuantity(false);
              }}
              className="w-20 px-2 py-1 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-green-500"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {item.quantity}
            <button
              onClick={startEditingQuantity}
              className="text-cult-lighter-gray hover:text-cult-white"
              title="Edit quantity"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-cult-white text-right whitespace-nowrap">
        {editingPrice ? (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              onBlur={savePrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePrice();
                if (e.key === 'Escape') setEditingPrice(false);
              }}
              className="w-24 px-2 py-1 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-green-500"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {formatCurrency(Number(item.unit_price))}
            <span className="text-xs text-cult-lighter-gray">
              /{item.pricing_unit || 'unit'}
            </span>
            <button
              onClick={startEditingPrice}
              className="text-cult-lighter-gray hover:text-cult-white"
              title="Edit price"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-sm font-bold text-green-400 text-right whitespace-nowrap">
        {formatCurrency(Number(item.subtotal))}
      </td>
      <td className="px-3 py-3 text-sm text-right sticky right-0 bg-cult-near-black border-l border-cult-medium-gray z-10">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setShowAssignmentModal(true)}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
              isFullyAssigned
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : isPartiallyAssigned
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-cult-medium-gray hover:bg-cult-lighter-gray text-cult-white'
            }`}
            title={
              isFullyAssigned
                ? 'Fully assigned - Click to view/modify'
                : isPartiallyAssigned
                ? `${remainingToAssign} ${item.pricing_unit || 'units'} remaining`
                : 'Click to assign packages'
            }
          >
            {isFullyAssigned ? (
              <CheckCircle className="w-3 h-3" />
            ) : isPartiallyAssigned ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Package className="w-3 h-3" />
            )}
            {isFullyAssigned ? 'Assigned' : isPartiallyAssigned ? 'Partial' : 'Assign'}
          </button>
          {!labelsLoading && stats.total > 0 && (
            <button
              onClick={() => setShowLabelPrintModal(true)}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold transition-colors rounded ${
                stats.pending === 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : stats.printed > 0
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-cult-medium-gray hover:bg-cult-lighter-gray text-cult-white'
              }`}
              title={`${stats.pending} label${stats.pending !== 1 ? 's' : ''} pending print`}
            >
              <Printer className="w-3 h-3" />
              Print ({stats.total})
            </button>
          )}
          <button
            onClick={() => onDelete(item.id, orderId)}
            className="text-red-400 hover:text-red-300"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
      </tr>

      {showAssignedPackages && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-cult-near-black border-t border-cult-medium-gray">
            <AssignedPackagesDisplay
              orderItemId={item.id}
              unit={item.pricing_unit || 'units'}
            />
          </td>
        </tr>
      )}

      <PackageAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        orderId={orderId}
        orderItemId={item.id}
        productName={item.product_name}
        orderItemQuantity={item.quantity}
        unit={item.pricing_unit || 'units'}
      />

      <OrderItemLabelPrintModal
        isOpen={showLabelPrintModal}
        onClose={() => setShowLabelPrintModal(false)}
        orderItemId={item.id}
        productName={item.product_name}
      />
    </>
  );
}
