import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

const GLASS_TILE = 'rounded-2xl border border-white/[0.07] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]';

interface KpiTileProps {
  layoutId: string;
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
  placeholder?: boolean;
}

export function KpiTile({
  layoutId,
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = '#E8E0D4',
  loading,
  placeholder,
}: KpiTileProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={`${GLASS_TILE} bg-white/[0.04] p-5 flex flex-col gap-2 min-h-[110px]`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className={`text-2xl font-bold tabular-nums ${placeholder ? 'text-white/20' : 'text-white'}`}>
            {value}
          </span>
          {subtitle && (
            <span className="text-xs text-white/40">{subtitle}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
