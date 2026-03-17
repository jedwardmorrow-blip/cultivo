import type { ActiveOrder } from '../hooks/useDashboardData';

interface Props {
  orders: ActiveOrder[];
  onSelectOrder: (orderId: string) => void;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'SUBMITTED', cls: 'bg-cult-accent/10 text-cult-accent-hover' },
  accepted: { label: 'ACCEPTED', cls: 'bg-cult-success/10 text-cult-success-bright' },
  processing: { label: 'PROCESSING', cls: 'bg-cult-stage-harvest/10 text-cult-stage-harvest' },
  ready_for_delivery: { label: 'READY', cls: 'bg-cult-success/10 text-cult-success-bright' },
};

function getUrgency(deliveryDate: string | null): { label: string; cls: string } | null {
  if (!deliveryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  const diff = Math.floor((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'OVERDUE', cls: 'bg-cult-accent/10 text-cult-accent' };
  if (diff === 0) return { label: 'DUE TODAY', cls: 'bg-cult-stage-harvest/10 text-cult-stage-harvest' };
  if (diff === 1) return { label: 'TOMORROW', cls: 'bg-blue-400/10 text-blue-400' };
  return { label: `${diff}d`, cls: 'bg-blue-400/10 text-blue-400' };
}

export function ActiveOrdersTable({ orders, onSelectOrder }: Props) {
  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Active Orders
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-blue-400/10 text-blue-400">
          {orders.length} open
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[0.625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-2 border-b border-cult-border">Order</th>
              <th className="text-left text-[0.625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-2 border-b border-cult-border">Status</th>
              <th className="text-left text-[0.625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-2 border-b border-cult-border">Amount</th>
              <th className="text-left text-[0.625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-2 border-b border-cult-border">Delivery</th>
              <th className="text-left text-[0.625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-2 border-b border-cult-border">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const status = STATUS_STYLES[order.status] || { label: order.status, cls: '' };
              const urgency = getUrgency(order.deliveryDate);
              return (
                <tr
                  key={order.id}
                  className="hover:bg-cult-surface-overlay cursor-pointer"
                  onClick={() => onSelectOrder(order.id)}
                >
                  <td className="text-[0.6875rem] font-semibold font-mono tracking-wider px-2.5 py-2.5 border-b border-cult-border-subtle">
                    {order.orderNumber}
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-cult-border-subtle">
                    <span className={`inline-block text-[0.5625rem] px-2 py-0.5 rounded-cult font-semibold uppercase tracking-wider ${status.cls}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="text-xs font-semibold tabular-nums px-2.5 py-2.5 border-b border-cult-border-subtle">
                    {order.amount > 0 ? `$${order.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="text-[0.6875rem] text-cult-text-muted font-light px-2.5 py-2.5 border-b border-cult-border-subtle">
                    {order.deliveryDate || '—'}
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-cult-border-subtle">
                    {urgency && (
                      <span className={`inline-block text-[0.5625rem] px-2 py-0.5 rounded-cult font-semibold uppercase tracking-wider ${urgency.cls}`}>
                        {urgency.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
