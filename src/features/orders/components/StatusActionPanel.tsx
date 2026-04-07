import { useState } from 'react';
import { ArrowRight, Undo2, XCircle, RotateCcw, AlertTriangle, Calendar } from 'lucide-react';
import {
  getNextStatus,
  getPreviousStatus,
  getTransitionLabel,
  requiresDeliveryDate,
  getStatusLabel,
} from '../utils/orderTransitions';
import { ConfirmDialog } from './ConfirmDialog';
import type { Order } from '../types';

interface StatusActionPanelProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => Promise<void>;
  onUpdateDeliveryDate: (orderId: string, newDate: string) => Promise<void>;
}

const STATUS_HINTS: Record<string, string> = {
  'submitted->accepted': 'Confirms the order and begins fulfillment planning.',
  'accepted->processing': 'Indicates batch allocation and processing have started.',
  'processing->ready_for_delivery': 'All items prepared. Ready for manifest and delivery.',
  'ready_for_delivery->completed': 'Inventory will be permanently deducted. All batches must have a valid COA (AZDHS R9-18-311).',
};

export function StatusActionPanel({
  order,
  onStatusUpdate,
  onUpdateDeliveryDate,
}: StatusActionPanelProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [pendingDate, setPendingDate] = useState('');

  const currentStatus = order.status || 'submitted';
  const nextStatus = getNextStatus(currentStatus);
  const prevStatus = getPreviousStatus(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isCompleted = currentStatus === 'completed';

  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;

  const handleTransition = async (toStatus: string) => {
    if (requiresDeliveryDate(currentStatus, toStatus) && !deliveryDate) {
      setShowDatePrompt(true);
      return;
    }

    setUpdating(toStatus);
    try {
      await onStatusUpdate(order.id, toStatus);
    } finally {
      setUpdating(null);
    }
  };

  const handleDateSubmitAndAdvance = async () => {
    if (!pendingDate) return;
    setUpdating('ready_for_delivery');
    try {
      await onUpdateDeliveryDate(order.id, pendingDate);
      await onStatusUpdate(order.id, 'ready_for_delivery');
    } finally {
      setUpdating(null);
      setShowDatePrompt(false);
      setPendingDate('');
    }
  };

  const forwardKey = nextStatus ? `${currentStatus}->${nextStatus}` : '';
  const hint = STATUS_HINTS[forwardKey] || '';

  return (
    <>
      <div className="bg-cult-near-black border border-cult-charcoal rounded-cult p-4 space-y-3">
        <h4 className="text-xs font-semibold text-cult-silver uppercase tracking-wider">
          Status Actions
        </h4>

        {showDatePrompt && (
          <div className="bg-cult-warning/15 border border-cult-warning/50 rounded-cult p-3 space-y-2">
            <div className="flex items-center gap-2 text-cult-warning text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              Delivery date required
            </div>
            <p className="text-xs text-cult-silver">
              Set a delivery date before marking this order as ready.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={pendingDate}
                onChange={(e) => setPendingDate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-cult-black border border-cult-charcoal rounded text-xs text-cult-off-white focus:outline-none focus:border-cult-green"
              />
              <button
                onClick={handleDateSubmitAndAdvance}
                disabled={!pendingDate || !!updating}
                className="px-3 py-1.5 bg-cult-green text-cult-black text-xs font-bold rounded hover:bg-cult-green-bright transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Set & Advance'}
              </button>
              <button
                onClick={() => { setShowDatePrompt(false); setPendingDate(''); }}
                className="px-2 py-1.5 text-xs text-cult-silver hover:text-cult-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isCancelled ? (
          <button
            onClick={() => setConfirmReopen(true)}
            disabled={!!updating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cult-info hover:bg-cult-info/80 text-white text-sm font-bold rounded-cult transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            {updating === 'submitted' ? 'Reopening...' : 'Reopen Order'}
          </button>
        ) : (
          <>
            {nextStatus && !showDatePrompt && (
              <div className="space-y-1.5">
                <button
                  onClick={() => handleTransition(nextStatus)}
                  disabled={!!updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cult-green hover:bg-cult-green-bright text-cult-black text-sm font-bold rounded-cult transition-all disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                  {updating === nextStatus
                    ? 'Updating...'
                    : getTransitionLabel(currentStatus, nextStatus)}
                </button>
                {hint && (
                  <p className="text-xs text-cult-lighter-gray leading-relaxed px-1">
                    {hint}
                  </p>
                )}
              </div>
            )}

            {prevStatus && (
              <button
                onClick={() => handleTransition(prevStatus)}
                disabled={!!updating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-cult-charcoal text-cult-silver hover:text-cult-white hover:border-cult-medium-gray text-xs font-semibold rounded-cult transition-all disabled:opacity-40"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {updating === prevStatus
                  ? 'Reverting...'
                  : getTransitionLabel(currentStatus, prevStatus)}
              </button>
            )}

            {!isCompleted && (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={!!updating}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-1.5 text-cult-danger hover:text-cult-danger/80 text-xs font-semibold transition-all disabled:opacity-40"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Order
              </button>
            )}

            {isCompleted && !prevStatus && null}
          </>
        )}
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Order"
          message={`Cancel order ${order.order_number}${order.customer_name ? ` for ${order.customer_name}` : ''}? Any reserved inventory will be released back to available stock.`}
          confirmLabel="Cancel Order"
          variant="danger"
          onConfirm={async () => {
            setConfirmCancel(false);
            setUpdating('cancelled');
            try {
              await onStatusUpdate(order.id, 'cancelled');
            } finally {
              setUpdating(null);
            }
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}

      {confirmReopen && (
        <ConfirmDialog
          title="Reopen Order"
          message={`Reopen order ${order.order_number}? It will be moved back to ${getStatusLabel('submitted')} status.`}
          confirmLabel="Reopen Order"
          variant="default"
          onConfirm={async () => {
            setConfirmReopen(false);
            setUpdating('submitted');
            try {
              await onStatusUpdate(order.id, 'submitted');
            } finally {
              setUpdating(null);
            }
          }}
          onCancel={() => setConfirmReopen(false)}
        />
      )}
    </>
  );
}
