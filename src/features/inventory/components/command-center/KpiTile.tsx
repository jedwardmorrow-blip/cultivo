import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

const GLASS = 'rounded-cult border border-cult-border bg-cult-surface-raised shadow-[0_8px_32px_rgba(0,0,0,0.5)]';

const staggerItem = {
 hidden: { opacity: 0, y: 12 },
 show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

interface KpiTileProps {
 layoutId: string;
 label: string;
 value: string;
 subtitle?: string;
 icon: LucideIcon;
 accent?: string;
 loading?: boolean;
 placeholder?: boolean;
 pulse?: boolean;
 onClick?: () => void;
}

export function KpiTile({
 layoutId,
 label,
 value,
 subtitle,
 icon: Icon,
 accent = '#E8E0D4',
 loading,
 placeholder,
 pulse,
 onClick,
}: KpiTileProps) {
 const Wrapper = onClick ? 'button' : 'div';

 return (
 <motion.div layoutId={layoutId} variants={staggerItem}>
 <Wrapper
 onClick={onClick}
 className={`${GLASS} p-4 flex items-center gap-3 w-full text-left relative overflow-hidden transition-all min-h-[90px]
 ${onClick ? 'cursor-pointer hover:bg-cult-surface-active hover:border-cult-border-strong' : ''}`}
 >
 {/* Accent glow */}
 <div
 className="absolute -top-6 left-4 rounded-full pointer-events-none"
 style={{
 width: '80px',
 height: '80px',
 background: `radial-gradient(circle, ${accent}18 0%, transparent70%)`,
 filter: 'blur(10px)',
 }}
 />

 {/* Icon */}
 <div
 className="w-9 h-9 rounded-cult flex items-center justify-center flex-shrink-0 relative"
 style={{ backgroundColor: `${accent}15` }}
 >
 <Icon className="w-4 h-4" style={{ color: accent }} />
 </div>

 {/* Content */}
 <div className="min-w-0 relative">
 {loading ? (
 <div className="h-7 w-20 rounded-lg bg-cult-surface-raised animate-pulse mb-1" />
 ) : (
 <div className="flex items-center gap-2">
 <span className={`text-2xl font-bold tabular-nums ${placeholder ? 'text-white/20' : 'text-white'}`}>
 {value}
 </span>
 {pulse && (
 <span className="relative flex h-2.5 w-2.5">
 <span
 className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
 style={{ backgroundColor: accent }}
 />
 <span
 className="relative inline-flex rounded-full h-2.5 w-2.5"
 style={{ backgroundColor: accent }}
 />
 </span>
 )}
 </div>
 )}
 <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
 {subtitle || label}
 </span>
 </div>
 </Wrapper>
 </motion.div>
 );
}
