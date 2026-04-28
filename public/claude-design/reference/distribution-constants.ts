import type { CalendarOrder } from '@/features/delivery/services/delivery.service';

// ─── Glass Tokens ──────────────────────────────────────────────────────────
// Matches Cultivation/Production CommandCenter patterns

export const GLASS =
  'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
export const GLASS_ELEVATED =
  'rounded-2xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)]';
export const GLASS_HOVER =
  'hover:bg-white/[0.10] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';

// ─── Animation ─────────────────────────────────────────────────────────────

export const springTransition = { type: 'spring' as const, stiffness: 300, damping: 28 };

export const fadeInVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Zone Colors (hex for MapLibre) ────────────────────────────────────────

export const ZONE_HEX: Record<string, string> = {
  local: '#A6A6A6',
  east_valley: '#2DD4BF',
  west_valley: '#FBBF24',
  tucson: '#38BDF8',
  northern_az: '#FB7185',
};

export const ZONE_LABELS: Record<string, string> = {
  local: 'Local',
  east_valley: 'East Valley',
  west_valley: 'West Valley',
  tucson: 'Tucson',
  northern_az: 'Northern AZ',
};

// ─── Facility ──────────────────────────────────────────────────────────────

export const FACILITY_CENTER: [number, number] = [-111.994514, 33.417454]; // [lng, lat] for MapLibre
export const FACILITY_NAME = 'Cult Cannabis Co.';

// ─── Map Config ────────────────────────────────────────────────────────────

export const DARK_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const AZ_BOUNDS: [[number, number], [number, number]] = [
  [-114.82, 31.33], // SW
  [-109.04, 36.00], // NE
];

// ─── Types ─────────────────────────────────────────────────────────────────

export type FocusedCard = 'map' | 'unscheduled' | 'route-summary' | null;
export type DocFilterMode = 'off' | 'pending' | 'overdue';

export interface OrderReadiness {
  orderId: string;
  itemsTotal: number;
  itemsAllocated: number;
  invoiceSent: boolean;
  coaSent: boolean;
  manifestSent: boolean;
  hasOverdueDoc: boolean;
  allDocsSent: boolean;
}

export interface DriverAssignment {
  id: string;
  deliveryDate: string;
  staffId: string;
  staffName: string;
  zoneId: string | null;
  notes: string | null;
}

export interface DayRouteInfo {
  date: string;
  orders: CalendarOrder[];
  zoneBreakdown: { zoneId: string; count: number }[];
  totalStops: number;
  totalDriveSeconds: number;
  totalRevenue: number;
  driver: DriverAssignment | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function getDaysInMonthInfo(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    daysInMonth: lastDay.getDate(),
    startingDayOfWeek: firstDay.getDay(),
    year,
    month,
  };
}
