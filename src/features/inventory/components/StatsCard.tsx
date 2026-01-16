import { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-cult-light-gray">{label}</p>
          <p className="text-2xl font-bold text-cult-white">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}
