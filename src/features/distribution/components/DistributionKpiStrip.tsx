import { motion } from 'framer-motion';
import { Truck, FileText, CalendarOff, DollarSign, MapPin } from 'lucide-react';
import { formatCurrencyShort } from '@/shared/utils/format';
import { GLASS, staggerContainer, staggerItem, ZONE_HEX } from '../constants';

interface DistributionKpiStripProps {
  shippingToday: number;
  docsPending: number;
  docsOverdue: number;
  unscheduledCount: number;
  monthRevenue: number;
  todayZones: Set<string>;
  docFilterActive: boolean;
  onShippingTodayClick: () => void;
  onDocsPendingClick: () => void;
  onUnscheduledClick: () => void;
}

function KpiTile({
  label,
  value,
  icon,
  accent,
  pulse,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
  pulse?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <motion.div variants={staggerItem}>
      <Wrapper
        onClick={onClick}
        className={`${GLASS} p-4 flex items-center gap-3 w-full text-left relative overflow-hidden transition-all
          ${onClick ? 'cursor-pointer hover:bg-cult-surface-active hover:border-cult-border-strong' : ''}
          ${active ? 'border-cult-border-active bg-cult-surface-active' : ''}`}
      >
        {accent && (
          <div
            className="absolute -top-6 left-4 rounded-full pointer-events-none"
            style={{
              width: '80px',
              height: '80px',
              background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
              filter: 'blur(10px)',
            }}
          />
        )}

        <div
          className="w-9 h-9 rounded-cult flex items-center justify-center flex-shrink-0 relative"
          style={{ backgroundColor: accent ? `${accent}15` : 'rgba(255,255,255,0.06)' }}
        >
          <div style={{ color: accent || 'rgba(255,255,255,0.5)' }}>{icon}</div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
            {pulse && (
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: accent || '#10B981' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: accent || '#10B981' }}
                />
              </span>
            )}
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
        </div>
      </Wrapper>
    </motion.div>
  );
}

export function DistributionKpiStrip({
  shippingToday,
  docsPending,
  docsOverdue,
  unscheduledCount,
  monthRevenue,
  todayZones,
  docFilterActive,
  onShippingTodayClick,
  onDocsPendingClick,
  onUnscheduledClick,
}: DistributionKpiStripProps) {
  const docsAccent = docsOverdue > 0 ? '#EF4444' : docsPending > 0 ? '#F59E0B' : '#10B981';

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4"
    >
      <KpiTile
        label="Shipping Today"
        value={String(shippingToday)}
        icon={<Truck className="w-4 h-4" />}
        accent="#10B981"
        pulse={shippingToday > 0}
        onClick={onShippingTodayClick}
      />
      <KpiTile
        label="Docs Pending"
        value={String(docsPending)}
        icon={<FileText className="w-4 h-4" />}
        accent={docsAccent}
        pulse={docsOverdue > 0}
        active={docFilterActive}
        onClick={onDocsPendingClick}
      />
      <KpiTile
        label="Unscheduled"
        value={String(unscheduledCount)}
        icon={<CalendarOff className="w-4 h-4" />}
        accent={unscheduledCount > 0 ? '#F59E0B' : undefined}
        onClick={onUnscheduledClick}
      />
      <KpiTile
        label="Revenue (Month)"
        value={formatCurrencyShort(monthRevenue)}
        icon={<DollarSign className="w-4 h-4" />}
        accent="#E8E0D4"
      />
      <KpiTile
        label="Routes Today"
        value={String(todayZones.size)}
        icon={<MapPin className="w-4 h-4" />}
        accent={todayZones.size > 0 ? '#2DD4BF' : undefined}
        onClick={onShippingTodayClick}
      />
    </motion.div>
  );
}
