import { useState, useCallback, useMemo } from 'react';
import { Plus, LayoutGrid, Table2 } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { OrderFilterBar, type OrderFilterState } from './OrderFilterBar';
import { OrderTable } from './OrderTable';
import { OrderCardView } from './OrderCardView';
import { OrderDetailPanel } from './OrderDetailPanel';
import { BulkActionBar } from './BulkActionBar';
import { useOrderList, useOrderActions, useProducts } from '../hooks';
import { useAdvancedFilteredOrders } from '../hooks/useAdvancedFilteredOrders';
import { PageSkeleton } from '@/shared/components';
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

type ViewMode = 'cards' | 'table';

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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

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
    return <PageSkeleton variant="table" />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">DISTRIBUTION</h1>
        </div>
        <div className="bg-cult-danger-muted border border-cult-danger/40 rounded p-8 text-center">
          <p className="text-cult-danger text-sm mb-4">{error.message}</p>
          <button
            onClick={() => actions.loadOrders(true)}
            className="px-5 py-2 border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black transition-colors rounded font-mono uppercase tracking-[0.16em] text-[11px]"
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
          <h1 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">DISTRIBUTION</h1>
          <p className="font-mono uppercase tracking-[0.12em] text-[10px] text-cult-text-muted mt-1.5 tabular-nums">
            {orders.length} total orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-cult-surface-inset border border-cult-border-subtle rounded p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono uppercase tracking-[0.14em] text-[11px] rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-cult-surface-raised text-cult-text-primary'
                  : 'text-cult-text-muted hover:text-cult-text-secondary'
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono uppercase tracking-[0.14em] text-[11px] rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-cult-surface-raised text-cult-text-primary'
                  : 'text-cult-text-muted hover:text-cult-text-secondary'
              }`}
              title="Table view"
            >
              <Table2 className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <button
            onClick={() => onCreateOrder()}
            className="flex items-center gap-2 px-4 py-2 border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black transition-colors rounded font-mono uppercase tracking-[0.16em] text-[11px]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Order
          </button>
        </div>
      </div>

      <OrderFilterBar
        orders={orders}
        filters={filters}
        onFilterChange={setFilters}
      />

      {viewMode === 'cards' ? (
        <OrderCardView
          orders={filteredOrders}
          selectedOrderId={drawerOrderId}
          selectedIds={selectedIds}
          onSelectOrder={handleSelectOrder}
          onSelectionChange={setSelectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onStatusChange={actions.updateOrderStatus}
        />
      ) : (
        <OrderTable
          orders={filteredOrders}
          selectedOrderId={drawerOrderId}
          selectedIds={selectedIds}
          onSelectOrder={handleSelectOrder}
          onSelectionChange={setSelectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onStatusChange={actions.updateOrderStatus}
        />
      )}

      {drawerOrder && (
        <OrderDetailPanel
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
          onToggleScheduled={actions.toggleScheduled}
        />
      )}

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          selectedOrders={orders.filter(o => selectedIds.has(o.id))}
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
