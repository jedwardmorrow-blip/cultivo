import { useState } from 'react';
import { Plus } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { OrderFilters } from './OrderFilters';
import { OrderMonthGroup } from './OrderMonthGroup';
import { useOrderList, useOrderExpansion, useOrderActions, useProducts } from '../hooks';
import { useFilteredOrders } from '../hooks/useFilteredOrders';
import { groupOrdersByMonthAndStatus, getStatusColor, getFulfillmentColor } from '../utils/orderGrouping';

interface UnifiedOrdersProps {
  onCreateOrder: () => void;
  onSelectOrder: (orderId: string) => void;
  selectedOrderId?: string | null;
}

export function UnifiedOrders({
  onCreateOrder,
  onSelectOrder,
  selectedOrderId,
}: UnifiedOrdersProps) {
  const { orders, loading, error } = useOrderList();
  const { products } = useProducts();
  const expansion = useOrderExpansion();
  const actions = useOrderActions();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<{ id: string; number: string } | null>(null);

  const filteredOrders = useFilteredOrders(orders, searchTerm, filterStatus);
  const monthGroups = groupOrdersByMonthAndStatus(filteredOrders);

  const handleGenerateInvoice = (orderId: string, orderNumber: string) => {
    setSelectedOrderForInvoice({ id: orderId, number: orderNumber });
    setShowInvoiceModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Orders & Fulfillment</h1>
            <p className="text-cult-light-gray mt-2">Manage orders, allocate inventory, and track fulfillment</p>
          </div>
        </div>
        <div className="bg-red-900/20 border-2 border-red-500 p-8 text-center">
          <p className="text-red-400 text-lg mb-4">{error.message}</p>
          <button
            onClick={() => actions.loadOrders(true)}
            className="px-6 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray hover:text-cult-white transition-all font-medium uppercase tracking-wider text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Orders & Fulfillment</h1>
          <p className="text-cult-light-gray mt-2">Manage orders, allocate inventory, and track fulfillment</p>
        </div>
        <button
          onClick={onCreateOrder}
          className="flex items-center px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray hover:text-cult-white transition-all font-medium uppercase tracking-wider text-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Order
        </button>
      </div>

      <OrderFilters
        searchTerm={searchTerm}
        filterStatus={filterStatus}
        onSearchChange={setSearchTerm}
        onStatusChange={setFilterStatus}
      />

      <div className="space-y-6">
        {monthGroups.length === 0 ? (
          <div className="bg-cult-near-black border-2 border-cult-medium-gray p-12 text-center text-cult-light-gray">
            No orders found
          </div>
        ) : (
          monthGroups.map((monthGroup) => (
            <OrderMonthGroup
              key={monthGroup.month}
              monthGroup={monthGroup}
              isExpanded={expansion.expandedMonths.has(monthGroup.month)}
              expandedStatuses={expansion.expandedStatuses}
              expandedOrders={expansion.expandedOrders}
              products={products}
              selectedOrderId={selectedOrderId}
              onToggleMonth={expansion.toggleMonth}
              onToggleStatus={expansion.toggleStatus}
              onToggleOrder={expansion.toggleOrder}
              onStatusUpdate={actions.updateOrderStatus}
              onDeleteOrder={actions.deleteOrder}
              onUpdateDeliveryDate={actions.updateDeliveryDate}
              onItemStatusUpdate={actions.updateItemStatus}
              onItemQuantityUpdate={actions.updateItemQuantity}
              onItemPriceUpdate={actions.updateItemPrice}
              onItemBatchUpdate={actions.updateItemBatch}
              onItemDelete={actions.deleteOrderItem}
              onAddItem={actions.addItemToOrder}
              onGenerateInvoice={handleGenerateInvoice}
              getStatusColor={getStatusColor}
              getFulfillmentColor={getFulfillmentColor}
            />
          ))
        )}
      </div>

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
