import { OrderWorkflowStatus } from './OrderWorkflowStatus';
import { ActiveProductionSessions } from './ActiveProductionSessions';
import { UpcomingDeliveries } from './UpcomingDeliveries';
import { SalesOverview } from './SalesOverview';
import { InventoryPipelineWidget } from './InventoryPipelineWidget';
import { PendingConversionsWidget } from './PendingConversionsWidget';
import { CultivationWidget } from './CultivationWidget';

const widgetCard = 'bg-cult-near-black border border-cult-medium-gray rounded-lg p-6 transition-colors duration-200 hover:border-cult-lighter-gray/60';

export function Dashboard({
  onViewChange,
  onSelectOrder
}: {
  onViewChange: (view: string) => void;
  onSelectOrder: (orderId: string) => void;
}) {
  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Dashboard</h1>
        <p className="text-cult-light-gray mt-2">Real-time production operations overview</p>
      </div>

      <div className={widgetCard}>
        <SalesOverview />
      </div>

      <div className={widgetCard}>
        <OrderWorkflowStatus onSelectOrder={onSelectOrder} />
      </div>

      <div className={widgetCard}>
        <InventoryPipelineWidget onViewChange={onViewChange} />
      </div>

      <div className={widgetCard}>
        <CultivationWidget onViewChange={onViewChange} />
      </div>

      <div className={widgetCard}>
        <PendingConversionsWidget onNavigateToConversions={() => onViewChange('inventory-conversions')} />
      </div>

      <div className={widgetCard}>
        <ActiveProductionSessions />
      </div>

      <div className={widgetCard}>
        <UpcomingDeliveries onSelectOrder={onSelectOrder} />
      </div>

      <div className={widgetCard}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onViewChange('orders')}
            className="px-4 py-3 bg-cult-white text-cult-black rounded-lg hover:bg-cult-green hover:text-cult-black transition-all duration-200 font-bold uppercase tracking-wider text-sm"
          >
            Create Order
          </button>
          <button
            onClick={() => onViewChange('trim-sessions')}
            className="px-4 py-3 border border-cult-medium-gray text-cult-white rounded-lg hover:border-cult-green hover:text-cult-green transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Start Trim Session
          </button>
          <button
            onClick={() => onViewChange('packaging-sessions')}
            className="px-4 py-3 border border-cult-medium-gray text-cult-white rounded-lg hover:border-cult-green hover:text-cult-green transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Start Packaging
          </button>
          <button
            onClick={() => onViewChange('delivery')}
            className="px-4 py-3 border border-cult-medium-gray text-cult-white rounded-lg hover:border-cult-green hover:text-cult-green transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Plan Deliveries
          </button>
        </div>
      </div>
    </div>
  );
}
