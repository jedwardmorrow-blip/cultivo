import { OrdersProvider } from '../context/OrdersContext';
import { OrdersErrorBoundary } from './OrdersErrorBoundary';
import { UnifiedOrders } from './UnifiedOrders';

interface OrdersContainerProps {
  onCreateOrder: () => void;
  onSelectOrder: (orderId: string) => void;
  selectedOrderId?: string | null;
  includeArchived?: boolean;
}

export function OrdersContainer({
  onCreateOrder,
  onSelectOrder,
  selectedOrderId,
  includeArchived = false,
}: OrdersContainerProps) {
  return (
    <OrdersErrorBoundary>
      <OrdersProvider includeArchived={includeArchived}>
        <UnifiedOrders
          onCreateOrder={onCreateOrder}
          onSelectOrder={onSelectOrder}
          selectedOrderId={selectedOrderId}
        />
      </OrdersProvider>
    </OrdersErrorBoundary>
  );
}
