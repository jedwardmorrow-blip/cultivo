/**
 * ProductionKpiStrip — Top KPI bar for the Production CommandCenter
 *
 * Shows: Active sessions, Completed today, Daily output, Avg throughput, Pending conversions
 */

import { Activity, CheckCircle2, Scale, TrendingUp, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { GLASS, SESSION_TYPE_COLORS, formatWeight, staggerContainer, staggerItem } from './constants';
import type { TrimSessionStats, BuckingSessionStats, PackagingSessionStats } from '../../types';

interface ProductionKpiStripProps {
  trimStats: TrimSessionStats;
  buckingStats: BuckingSessionStats;
  packagingStats: PackagingSessionStats;
  pendingConversionsCount: number;
  hasStalePending: boolean;
  onConversionsClick?: () => void;
}

interface KpiTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  pulse?: boolean;
  onClick?: () => void;
  sublabel?: string;
}

function KpiTile({ label, value, icon, accent, pulse, onClick, sublabel }: KpiTileProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <motion.div variants={staggerItem}>
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`${GLASS} p-4 flex items-center gap-3 w-full text-left ${
          onClick ? 'cursor-pointer hover:bg-white/[0.10] hover:border-white/[0.15] transition-all active:scale-[0.98]' : ''
        }`}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accent ? `${accent}15` : 'rgba(255,255,255,0.06)' }}
        >
          <div style={{ color: accent || 'rgba(255,255,255,0.5)' }}>
            {icon}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
            {pulse && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accent || '#10B981' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: accent || '#10B981' }} />
              </span>
            )}
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
          {sublabel && <span className="block text-[10px] text-white/25 mt-0.5">{sublabel}</span>}
        </div>
      </Wrapper>
    </motion.div>
  );
}

export function ProductionKpiStrip({
  trimStats,
  buckingStats,
  packagingStats,
  pendingConversionsCount,
  hasStalePending,
  onConversionsClick,
}: ProductionKpiStripProps) {
  const totalActive = trimStats.activeSessions + buckingStats.activeSessions + packagingStats.activeSessions;
  const totalCompleted = trimStats.completedToday + buckingStats.completedToday + packagingStats.completedToday;

  // Daily output in grams (flower from trim + flower from bucking)
  const dailyOutputG = (trimStats.totalFlowerToday || 0) + (buckingStats.totalFlowerToday || 0);

  // Average throughput — use trim avg g/hr as the primary metric
  const avgThroughput = trimStats.avgGramsPerHour || 0;

  // Pending conversions accent color
  const pendingAccent = hasStalePending ? '#EF4444' : pendingConversionsCount > 0 ? '#F59E0B' : '#10B981';

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-5 gap-3"
    >
      <KpiTile
        label="Active"
        value={totalActive}
        icon={<Activity className="w-4.5 h-4.5" />}
        accent={totalActive > 0 ? '#10B981' : undefined}
        pulse={totalActive > 0}
        sublabel={totalActive > 0 ? `${buckingStats.activeSessions}B · ${trimStats.activeSessions}T · ${packagingStats.activeSessions}P` : undefined}
      />
      <KpiTile
        label="Completed"
        value={totalCompleted}
        icon={<CheckCircle2 className="w-4.5 h-4.5" />}
        accent="#10B981"
      />
      <KpiTile
        label="Output"
        value={formatWeight(dailyOutputG)}
        icon={<Scale className="w-4.5 h-4.5" />}
        accent="#E8E0D4"
      />
      <KpiTile
        label="Avg g/hr"
        value={avgThroughput > 0 ? avgThroughput.toFixed(1) : '—'}
        icon={<TrendingUp className="w-4.5 h-4.5" />}
        accent={SESSION_TYPE_COLORS.trim.hex}
      />
      <KpiTile
        label="Conversions"
        value={pendingConversionsCount}
        icon={<Package className="w-4.5 h-4.5" />}
        accent={pendingAccent}
        onClick={onConversionsClick}
        sublabel={pendingConversionsCount > 0 ? 'awaiting finalization' : 'all clear'}
      />
    </motion.div>
  );
}
