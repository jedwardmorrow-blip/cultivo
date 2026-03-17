import type { KPIData } from '../hooks/useDashboardData';

interface Props {
  data: KPIData;
}

interface KPICard {
  label: string;
  value: string;
  sub: string;
  accent: 'success' | 'blue' | 'amber' | 'package' | 'danger';
}

const ACCENT_CLASSES: Record<string, { border: string; value: string; bar: string }> = {
  success: { border: 'before:bg-cult-success', value: 'text-cult-success-bright', bar: '' },
  blue: { border: 'before:bg-blue-400', value: 'text-blue-400', bar: '' },
  amber: { border: 'before:bg-cult-stage-harvest', value: 'text-cult-stage-harvest', bar: '' },
  package: { border: 'before:bg-cult-stage-package', value: 'text-cult-stage-package', bar: '' },
  danger: { border: 'before:bg-cult-accent', value: 'text-cult-accent', bar: '' },
};

function fmtLbs(n: number): string {
  return n >= 100 ? Math.round(n).toLocaleString() + ' lbs' : n.toFixed(1) + ' lbs';
}

function fmtMoney(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toLocaleString();
}

export function KPIRow({ data }: Props) {
  const cards: KPICard[] = [
    {
      label: 'Revenue MTD',
      value: fmtMoney(data.revenueMTD),
      sub: `${data.mtdOrders} orders · ${data.mtdCustomers} customers`,
      accent: 'success',
    },
    {
      label: 'Open Pipeline',
      value: fmtMoney(data.openPipeline),
      sub: `${data.openOrderCount} active orders`,
      accent: 'blue',
    },
    {
      label: 'Inventory In Process',
      value: fmtLbs(data.inventoryInProcessLbs),
      sub: 'Bucked + Trim + Bulk stages',
      accent: 'amber',
    },
    {
      label: 'Packaged & Ready',
      value: fmtLbs(data.packagedLbs),
      sub: data.packagedLbs < 5 ? 'Critical — bottleneck' : 'Ready to ship',
      accent: 'package',
    },
    {
      label: 'Harvest Incoming',
      value: fmtLbs(data.harvestIncomingLbs),
      sub: `${data.harvestWindows} windows · 60-day pipeline`,
      accent: 'danger',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {cards.map(card => {
        const accent = ACCENT_CLASSES[card.accent];
        return (
          <div
            key={card.label}
            className={`bg-cult-surface-raised border border-cult-border rounded-cult p-5 relative overflow-hidden animate-fade-in
              hover:border-cult-border-strong hover:shadow-glow transition-colors duration-200
              before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 ${accent.border}`}
          >
            <div className="text-[0.6875rem] uppercase tracking-[1.5px] text-cult-text-muted font-semibold mb-2">
              {card.label}
            </div>
            <div className={`text-[2rem] font-bold tracking-tight leading-none ${accent.value}`}>
              {card.value}
            </div>
            <div className="text-[0.6875rem] font-light text-cult-text-muted mt-1.5">
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
