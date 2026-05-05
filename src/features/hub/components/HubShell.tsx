import React from 'react';
import { StatCard } from '@/shared/components/StatCard';

interface KpiDef {
  label: string;
  value: string;
  sub?: string;
}

interface HubShellProps {
  section: string;
  icon: React.ElementType;
  kpis?: KpiDef[];
  children: React.ReactNode;
}

export function HubShell({ section, icon: Icon, kpis, children }: HubShellProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen text-cult-text-primary">
      <div className="px-6 py-4 border-b border-cult-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-cult-text-muted" />
            <h1 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">{section}</h1>
          </div>
          <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted">{dateStr} &middot; {timeStr}</span>
        </div>
      </div>
      <div className="px-6 py-4">
        {kpis && kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {kpis.slice(0, 3).map((kpi) => (
              <StatCard key={kpi.label} label={kpi.label} value={kpi.value} subtitle={kpi.sub} />
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
