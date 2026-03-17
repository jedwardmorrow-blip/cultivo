import type { KPIData } from '../hooks/useDashboardData';

interface Props {
  data: KPIData;
}

interface KPICard {
  label: string;
  value: string;
  sub: string;
  icon: string;
  alert?: boolean;
}

function fmtLbs(n: number): string {
  return n >= 100 ? Math.round(n).toLocaleString() + ' lbs' : n.toFixed(1) + ' lbs';
}

function fmtMoney(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toLocaleString();
}

/* Simple SVG icons matching the existing app style */
const ICONS: Record<string, JSX.Element> = {
  dollar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  pipeline: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  ),
  box: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
  package: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  plant: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 5.25A3.75 3.75 0 0 1 12 9m0 0a3.75 3.75 0 0 1-3.75-3.75M12 9V3m0 0a3.75 3.75 0 0 1 3.75 3.75M12 3a3.75 3.75 0 0 0-3.75 3.75m0 0A3.75 3.75 0 0 1 12 9m-8.25 6.75h.008v.008H3.75v-.008Zm0 0A8.25 8.25 0 0 1 12 12.75a8.25 8.25 0 0 1 8.25 3.75" />
    </svg>
  ),
};

export function KPIRow({ data }: Props) {
  const cards: KPICard[] = [
    {
      label: 'Revenue MTD',
      value: fmtMoney(data.revenueMTD),
      sub: `${data.mtdOrders} orders · ${data.mtdCustomers} customers`,
      icon: 'dollar',
    },
    {
      label: 'Open Pipeline',
      value: fmtMoney(data.openPipeline),
      sub: `${data.openOrderCount} active orders`,
      icon: 'pipeline',
    },
    {
      label: 'Inventory In Process',
      value: fmtLbs(data.inventoryInProcessLbs),
      sub: 'Bucked + Trim + Bulk stages',
      icon: 'box',
    },
    {
      label: 'Packaged & Ready',
      value: fmtLbs(data.packagedLbs),
      sub: data.packagedLbs < 5 ? 'Critical — bottleneck' : 'Ready to ship',
      icon: 'package',
      alert: data.packagedLbs < 5,
    },
    {
      label: 'Harvest Incoming',
      value: fmtLbs(data.harvestIncomingLbs),
      sub: `${data.harvestWindows} windows · 60-day pipeline`,
      icon: 'plant',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {cards.map(card => (
        <div
          key={card.label}
          className={`bg-cult-surface-raised border rounded-cult p-5 animate-fade-in
            hover:border-cult-border-strong transition-colors duration-200
            ${card.alert ? 'border-cult-accent' : 'border-cult-border'}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="text-[0.6875rem] uppercase tracking-[1.5px] text-cult-text-muted font-semibold">
              {card.label}
            </div>
            <div className="text-cult-text-muted opacity-50">
              {ICONS[card.icon]}
            </div>
          </div>
          <div className="text-[2rem] font-bold tracking-tight leading-none text-cult-text-primary">
            {card.value}
          </div>
          <div className={`text-[0.6875rem] font-light mt-1.5 ${card.alert ? 'text-cult-accent' : 'text-cult-text-muted'}`}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
