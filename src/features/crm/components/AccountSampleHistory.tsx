import { useState, useEffect } from 'react';
import { Gift, Package, Calendar } from 'lucide-react';
import { getAccountSampleItems } from '../services/crm.service';

interface SampleItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  status: string;
  is_sample: boolean;
  products: { name: string; type: string; product_category: string } | null;
  orders: { id: string; order_number: string; order_date: string; status: string } | null;
}

interface AccountSampleHistoryProps {
  customerId: string;
}

export function AccountSampleHistory({ customerId }: AccountSampleHistoryProps) {
  const [items, setItems] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await getAccountSampleItems(customerId);
      if (!cancelled) {
        setItems((data || []) as SampleItem[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading) {
    return (
      <div className="bg-cult-surface border border-cult-border rounded-lg p-8 text-center">
        <div className="w-5 h-5 border-2 border-cult-green border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-cult-surface border border-cult-border rounded-lg p-8 text-center">
        <Gift className="w-10 h-10 text-cult-surface-raised mx-auto mb-3" />
        <p className="text-cult-text-secondary text-sm">No samples sent to this account yet</p>
      </div>
    );
  }

  const grouped = items.reduce<Record<string, { orderNumber: string; orderDate: string; orderStatus: string; items: SampleItem[] }>>((acc, item) => {
    const orderId = item.orders?.id || 'unknown';
    if (!acc[orderId]) {
      acc[orderId] = {
        orderNumber: item.orders?.order_number || 'Unknown',
        orderDate: item.orders?.order_date || '',
        orderStatus: item.orders?.status || '',
        items: [],
      };
    }
    acc[orderId].items.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">Sample History</h3>
        <span className="text-xs text-cult-text-secondary">
          {items.length} sample item{items.length !== 1 ? 's' : ''} across {Object.keys(grouped).length} order{Object.keys(grouped).length !== 1 ? 's' : ''}
        </span>
      </div>

      {Object.entries(grouped).map(([orderId, group]) => (
        <div key={orderId} className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-cult-surface/50 border-b border-cult-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-cult-text-primary">{group.orderNumber}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-cult-warning-muted text-cult-warning border border-cult-warning/40 rounded uppercase">
                <Gift className="w-3 h-3" />
                Sample
              </span>
            </div>
            {group.orderDate && (
              <span className="flex items-center gap-1 text-xs text-cult-text-secondary">
                <Calendar className="w-3 h-3" />
                {new Date(group.orderDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          <div className="divide-y divide-cult-surface-raised">
            {group.items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-cult-border" />
                  <div>
                    <p className="text-sm text-cult-text-primary">{item.products?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-cult-text-secondary">{item.products?.type} - {item.products?.product_category}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-cult-text-secondary">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
