import { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, Package, Trash2, Calendar, Gift } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OrderHeaderProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    priority: string;
    customer_name: string | null;
    total_amount: number;
    item_count: number;
    requested_delivery_date: string | null;
    scheduled_delivery_date: string | null;
    order_source?: string | null;
    is_sample?: boolean;
  };
  isExpanded: boolean;
  workflow?: {
    overall_progress_percentage: number;
    ready_to_ship: boolean;
  };
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onUpdateDeliveryDate?: (orderId: string, newDate: string) => Promise<void>;
  getStatusColor: (status: string) => string;
  getFulfillmentColor: (percentage: number) => string;
}

export function OrderHeader({
  order,
  isExpanded,
  workflow,
  onToggle,
  onStatusChange,
  onDelete,
  onUpdateDeliveryDate,
  getStatusColor,
}: OrderHeaderProps) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');

  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;

  const handleDateChange = async (newDate: string) => {
    if (onUpdateDeliveryDate && newDate && newDate !== deliveryDate) {
      await onUpdateDeliveryDate(order.id, newDate);
    }
    setIsEditingDate(false);
    setTempDate('');
  };

  return (
    <div onClick={onToggle} className="p-5 cursor-pointer hover:bg-cult-dark-gray transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-6 h-6 text-cult-white" />
            ) : (
              <ChevronRight className="w-6 h-6 text-cult-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-xl font-bold text-cult-white uppercase tracking-wider">
                {order.order_number}
              </span>
              <select
                value={order.status}
                onChange={(e) => {
                  e.stopPropagation();
                  onStatusChange(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className={`px-3 py-1.5 text-xs font-bold border-2 ${getStatusColor(order.status)} cursor-pointer hover:opacity-80 transition-all uppercase tracking-wider bg-cult-near-black`}
              >
                <option value="submitted">Submitted</option>
                <option value="accepted">Accepted</option>
                <option value="processing">Processing</option>
                <option value="ready_for_delivery">Ready for Delivery</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {order.is_sample && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 uppercase tracking-wider">
                  <Gift className="w-3.5 h-3.5" />
                  SAMPLE
                </span>
              )}
              {workflow?.ready_to_ship && (
                <span className="px-3 py-1.5 text-xs font-bold bg-green-900/30 text-green-400 border-2 border-green-600 uppercase tracking-wider">
                  READY TO SHIP
                </span>
              )}
              {order.priority === 'urgent' && (
                <span className="px-3 py-1.5 text-xs font-bold bg-red-900/30 text-red-400 border-2 border-red-600 uppercase tracking-wider">
                  URGENT
                </span>
              )}
            </div>
            <div className="text-sm text-cult-light-gray font-medium">
              {order.customer_name || 'Unknown Customer'}
            </div>
            <div
              className="flex items-center gap-2 mt-1 group"
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar className="w-3 h-3 text-cult-lighter-gray" />
              {isEditingDate ? (
                <input
                  type="date"
                  value={tempDate || deliveryDate || ''}
                  onChange={(e) => setTempDate(e.target.value)}
                  onBlur={(e) => handleDateChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleDateChange(tempDate);
                    } else if (e.key === 'Escape') {
                      setIsEditingDate(false);
                      setTempDate('');
                    }
                  }}
                  autoFocus
                  className="px-2 py-1 text-xs bg-cult-dark-gray border border-cult-white text-cult-white focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingDate(true);
                    setTempDate(deliveryDate || '');
                  }}
                  className="text-xs text-cult-lighter-gray hover:text-cult-white transition-colors hover:underline"
                >
                  {deliveryDate
                    ? `Delivery: ${new Date(deliveryDate).toLocaleDateString()}`
                    : 'Set delivery date'}
                </button>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">Items</div>
              <div className="flex items-center gap-2 text-cult-white font-bold">
                <Package className="w-4 h-4" />
                <span>{order.item_count}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">Order Total</div>
              <div className="flex items-center gap-2 font-bold text-green-400 text-lg">
                <DollarSign className="w-5 h-5" />
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-red-400 hover:bg-red-900/30 border-2 border-transparent hover:border-red-600 transition-all"
            title="Delete order"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
