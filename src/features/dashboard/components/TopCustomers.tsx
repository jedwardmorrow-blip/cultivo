import type { CustomerRevenue } from '../hooks/useDashboardData';

interface Props {
  customers: CustomerRevenue[];
}

export function TopCustomers({ customers }: Props) {
  const maxRev = customers[0]?.revenue || 1;
  const top3Rev = customers.slice(0, 3).reduce((s, c) => s + c.revenue, 0);
  const totalRev = customers.reduce((s, c) => s + c.revenue, 0);
  const top3Pct = totalRev > 0 ? Math.round((top3Rev / totalRev) * 100) : 0;

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Top Customers — Lifetime Revenue
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-success/10 text-cult-success-bright">
          {customers.length} accounts
        </span>
      </div>

      <div className="space-y-1">
        {customers.map(c => (
          <div key={c.name} className="flex items-center gap-2.5 py-1">
            <div className="w-[130px] text-[0.6875rem] font-normal text-cult-text-secondary truncate" title={c.name}>
              {c.name}
            </div>
            <div className="flex-1 h-3.5 bg-cult-surface-overlay rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${(c.revenue / maxRev) * 100}%`,
                  background: 'linear-gradient(90deg, #FFFFFF, #A6A6A6)',
                }}
              />
            </div>
            <div className="min-w-[55px] text-right text-[0.6875rem] font-semibold tabular-nums text-cult-text-secondary">
              ${(c.revenue / 1000).toFixed(1)}K
            </div>
          </div>
        ))}
      </div>

      {customers.length >= 3 && (
        <div className="mt-3.5 px-3.5 py-2.5 bg-cult-surface-overlay rounded-cult text-[0.6875rem] font-light text-cult-text-secondary border-l-2 border-cult-text-muted">
          <strong className="text-cult-text-primary font-semibold">Concentration risk:</strong>{' '}
          Top 3 accounts = {top3Pct}% of revenue.{' '}
          {customers.slice(0, 3).map(c => c.name).join(', ')} = ${(top3Rev / 1000).toFixed(1)}K combined.
        </div>
      )}
    </div>
  );
}
