import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { OrderFilterBar, type OrderFilterState } from './OrderFilterBar';
import { OrderTable } from './OrderTable';
import { OrderDrawer } from './OrderDrawer';
import { BulkActionBar } from './BulkActionBar';
import { useOrderList, useOrderActions, useProducts } from '../hooks';
import { useAdvancedFilteredOrders } from '../hooks/useAdvancedFilteredOrders';
import type { Order } from '../types';

interface UnifiedOrdersProps {
  onCreateOrder: (cloneFrom?: Order) => void;
  onSelectOrder: (orderId: string) => void;
  selectedOrderId?: string | null;
}

const DEFAULT_FILTERS: OrderFilterState = {
  searchTerm: '',
  status: 'all',
  customerName: '',
  priority: '',
  dateFrom: '',
  dateTo: '',
};

export function UnifiedOrders({
  onCreateOrder,
  onSelectOrder,
}: UnifiedOrdersProps) {
  const { orders, loading, error } = useOrderList();
  const { products } = useProducts();
  const actions = useOrderActions();

  const [filters, setFilters] = useState<OrderFilterState>(DEFAULT_FILTERS);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<{ id: string; number: string } | null>(null);

  const filteredOrders = useAdvancedFilteredOrders(orders, filters);

  const drawerOrder = useMemo(
    () => orders.find(o => o.id === drawerOrderId) || null,
    [orders, drawerOrderId],
  );

  const handleSelectOrder = useCallback((orderId: string) => {
    setDrawerOrderId(orderId);
    onSelectOrder(orderId);
    actions.loadOrderDetails(orderId);
  }, [onSelectOrder, actions]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOrderId(null);
  }, []);

  const handleToggleSelect = useCallback((orderId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === filteredOrders.length) {
        return new Set();
      }
      return new Set(filteredOrders.map(o => o.id));
    });
  }, [filteredOrders]);

  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    const promises = Array.from(selectedIds).map(id =>
      actions.updateOrderStatus(id, newStatus),
    );
    await Promise.all(promises);
    setSelectedIds(new Set());
  }, [selectedIds, actions]);

  const handleGenerateInvoice = useCallback((orderId: string, orderNumber: string) => {
    setSelectedOrderForInvoice({ id: orderId, number: orderNumber });
    setShowInvoiceModal(true);
  }, []);

  const handleCloneOrder = useCallback((order: Order) => {
    onCreateOrder(order);
    setDrawerOrderId(null);
  }, [onCreateOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cult-green border-t-transparent rounded-full animate-spin" />
          <span className="text-cult-silver text-sm">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cult-off-white tracking-wide">Orders</h1>
        </div>
        <div className="bg-red-900/20 border border-red-800/50 rounded-cult p-8 text-center">
          <p className="text-red-400 text-sm mb-4">{error.message}</p>
          <button
            onClick={() => actions.loadOrders(true)}
            className="px-5 py-2 bg-cult-off-white text-cult-black rounded-cult hover:bg-cult-silver transition-all text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-off-white tracking-wide">Orders</h1>
          <p className="text-cult-silver text-sm mt-1">
            {orders.length} total orders
          </p>
        </div>
        <button
          onClick={() => onCreateOrder()}
          className="flex items-center gap-2 px-4 py-2.5 bg-cult-green text-cult-black rounded-cult hover:bg-cult-green-bright transition-all text-sm font-bold shadow-lg hover:shadow-cult-green/20"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      <OrderFilterBar
        orders={orders}
        filters={filters}
        onFilterChange={setFilters}
      />

      <OrderTable
        orders={filteredOrders}
        selectedOrderId={drawerOrderId}
        selectedIds={selectedIds}
        onSelectOrder={handleSelectOrder}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onStatusChange={actions.updateOrderStatus}
      />

      {drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          products={products}
          onClose={handleCloseDrawer}
          onStatusUpdate={actions.updateOrderStatus}
          onDeleteOrder={actions.deleteOrder}
          onUpdateDeliveryDate={actions.updateDeliveryDate}
          onItemStatusUpdate={actions.updateItemStatus}
          onItemQuantityUpdate={actions.updateItemQuantity}
          onItemPriceUpdate={actions.updateItemPrice}
          onItemBatchUpdate={actions.updateItemBatch}
          onItemSampleToggle={actions.updateItemSample}
          onItemDelete={actions.deleteOrderItem}
          onAddItem={actions.addItemToOrder}
          onGenerateInvoice={handleGenerateInvoice}
          onCloneOrder={handleCloneOrder}
        />
      )}

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkStatusChange={handleBulkStatusChange}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {showInvoiceModal && selectedOrderForInvoice && (
        <InvoiceModal
          orderId={selectedOrderForInvoice.id}
          orderNumber={selectedOrderForInvoice.number}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedOrderForInvoice(null);
          }}
        />
      )}
    </div>
  );
}
