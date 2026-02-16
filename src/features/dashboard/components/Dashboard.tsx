import { OrderWorkflowStatus } from './OrderWorkflowStatus';
import { ActiveProductionSessions } from './ActiveProductionSessions';
import { UpcomingDeliveries } from './UpcomingDeliveries';
import { SalesOverview } from './SalesOverview';
import { BatchAllocationOverview } from './BatchAllocationOverview';
import { PendingConversionsWidget } from './PendingConversionsWidget';

export function Dashboard({
  onViewChange,
  onSelectOrder
}: {
  onViewChange: (view: string) => void;
  onSelectOrder: (orderId: string) => void;
}) {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Dashboard</h1>
        <p className="text-cult-light-gray mt-2">Real-time production operations overview</p>
      </div>

      {/* Sales Overview */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <SalesOverview />
      </div>

      {/* Order Workflow Status - Top Priority */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <OrderWorkflowStatus onSelectOrder={onSelectOrder} />
      </div>

      {/* Batch Allocation Overview */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <BatchAllocationOverview />
      </div>

      {/* Pending Conversions Widget */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <PendingConversionsWidget onNavigateToConversions={() => onViewChange('inventory-conversions')} />
      </div>

      {/* Active Production Sessions - Real-time Visibility */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <ActiveProductionSessions />
      </div>

      {/* Upcoming Deliveries */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <UpcomingDeliveries onSelectOrder={onSelectOrder} />
      </div>

      {/* Quick Actions */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onViewChange('orders')}
            className="px-4 py-3 bg-cult-white text-cult-black hover:bg-cult-green hover:text-cult-black transition-all duration-200 font-bold uppercase tracking-wider text-sm"
          >
            Create Order
          </button>
          <button
            onClick={() => onViewChange('trim-sessions')}
            className="px-4 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-green hover:text-cult-green transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Start Trim Session
          </button>
          <button
            onClick={() => onViewChange('packaging-sessions')}
            className="px-4 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-green hover:text-cult-green transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Start Packaging
          </button>
          <button
            onClick={() => onViewChange('delivery')}
            className="px-4 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-green hover:text-cult-green transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Plan Deliveries
          </button>
        </div>
      </div>
    </div>
  );
}
