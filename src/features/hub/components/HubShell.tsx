import React from 'react';
import { StatCard } from '@/shared/components/StatCard';
import { PendingCell } from '@/shared/components/PendingCell';

interface KpiDef {
  label: string;
  value: string;
  sub?: string;
  /** When true, renders a PendingCell empty-state instead of a StatCard. */
  pending?: boolean;
  /** Optional reason text for the pending state. */
  pendingReason?: string;
  /** Optional setup route or handler for the pending state. */
  setupHref?: string;
  onSetup?: () => void;
  trend?: { value: number; label?: string };
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
            <span className="cult-section-icon" aria-hidden="true">
              <Icon />
            </span>
            <h1 className="cult-section-label">{section}</h1>
          </div>
          <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted">{dateStr} &middot; {timeStr}</span>
        </div>
      </div>
      <div className="px-6 py-4">
        {kpis && kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {kpis.slice(0, 3).map((kpi) => (
              kpi.pending ? (
                <PendingCell
                  key={kpi.label}
                  label={kpi.label}
                  reason={kpi.pendingReason}
                  setupHref={kpi.setupHref}
                  onSetup={kpi.onSetup}
                />
              ) : (
                <StatCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  subtitle={kpi.sub}
                  trend={kpi.trend}
                />
              )
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
