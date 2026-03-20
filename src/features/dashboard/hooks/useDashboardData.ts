import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlantGroupWithStrain } from '@/types';

// ── Types ──────────────────────────────────────────────────────

export interface RevenueGoal {
  target: number;
  mtd: number;
  pct: number;
  dayOfMonth: number;
  daysInMonth: number;
  dayPct: number;
  rollingAvg: number;
  bestMonth: number;
  openPipeline: number;
  openOrderCount: number;
}

export interface KPIData {
  revenueMTD: number;
  mtdOrders: number;
  mtdCustomers: number;
  openPipeline: number;
  openOrderCount: number;
  inventoryInProcessLbs: number;    // raw weight across all in-process stages
  finishedEquivLbs: number;         // projected weight after buck + trim
  packagedLbs: number;
  harvestIncomingLbs: number;
  harvestWindows: number;
}

export interface FunnelStage {
  label: string;
  lbs: number;         // raw on-hand weight at this stage
  finishedLbs: number; // estimated weight after remaining processing
  color: string;
  revenueEst: number;  // based on finishedLbs × price
}

export interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  amount: number;
  deliveryDate: string | null;
  customerName: string;
}

export interface CustomerRevenue {
  name: string;
  revenue: number;
}

export interface ProductionStats {
  buckingSessions: number;
  buckingInput: number;
  buckingOutput: number;
  trimSessions: number;
  trimInput: number;
  trimOutput: number;
  buckingYield: number;
  trimYield: number;
}

export interface CultivationSummary {
  flowerCount: number;
  vegCount: number;
  harvestedCount: number;
  totalPlants: number;
}

export interface DryRoom {
  name: string;
  status: 'available' | 'drying';
  detail?: string;
  subDetail?: string;
}

export interface ActiveStrain {
  name: string;
  lbs: number;
  stage: 'flower' | 'cure' | 'clone';
}

export interface HarvestWindow {
  room: string;
  date: string;
  strainCount: number;
  plants: number;
  estDryLbs: number;
  isOverdue: boolean;
  dateColor: string;
  barColor: string;
}

export interface VegStrain {
  name: string;
  count: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface WeeklyRevenue {
  week: string;
  revenue: number;
}

export interface DashboardData {
  revenueGoal: RevenueGoal;
  kpi: KPIData;
  funnel: FunnelStage[];
  orders: ActiveOrder[];
  customers: CustomerRevenue[];
  production: ProductionStats;
  cultivation: CultivationSummary;
  dryRooms: DryRoom[];
  activeStrains: ActiveStrain[];
  harvestPipeline: HarvestWindow[];
  vegStrains: VegStrain[];
  monthlyRevenue: MonthlyRevenue[];
  weeklyRevenue: WeeklyRevenue[];
}

// ── Helpers ────────────────────────────────────────────────────

function gramsToLbs(g: number): number {
  return g / 453.592;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ── Data fetching ──────────────────────────────────────────────

async function fetchRevenueData(): Promise<{
  monthlyRevenue: MonthlyRevenue[];
  weeklyRevenue: WeeklyRevenue[];
  mtd: number;
  mtdOrders: number;
  mtdCustomers: number;
  openPipeline: number;
  openOrderCount: number;
  orders: ActiveOrder[];
  customers: CustomerRevenue[];
}> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Fetch all non-cancelled orders from the pipeline view
  // order_pipeline columns: id, order_number, status, priority, requested_delivery_date,
  // scheduled_delivery_date, delivery_notes, internal_notes, created_at, updated_at,
  // archived, order_source, is_sample, customer_name, total_amount, item_count
  const { data: allOrders } = await supabase
    .from('order_pipeline')
    .select('*')
    .eq('archived', false)
    .eq('is_sample', false)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false });

  const rows = allOrders || [];

  // MTD revenue — only count completed/delivered orders as actual revenue
  const revenueStatuses = ['completed', 'delivered'];
  const mtdRows = rows.filter(o => {
    if (!revenueStatuses.includes(o.status)) return false;
    const dt = o.scheduled_delivery_date || (o.created_at ? o.created_at.split('T')[0] : null);
    return dt && dt >= monthStart;
  });
  const mtd = mtdRows.reduce((s, o) => s + (o.total_amount || 0), 0);
  // Use customer_name for unique customer count (no customer_id on this view)
  const mtdCustomerSet = new Set(mtdRows.map(o => o.customer_name).filter(Boolean));

  // Open pipeline
  const openStatuses = ['submitted', 'accepted', 'processing', 'ready_for_delivery'];
  const openOrders = rows.filter(o => o.status && openStatuses.includes(o.status));
  const openPipeline = openOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

  // Active orders for the table
  const activeOrders: ActiveOrder[] = openOrders.slice(0, 15).map(o => ({
    id: o.id || '',
    orderNumber: o.order_number || '—',
    status: o.status || 'submitted',
    amount: o.total_amount || 0,
    deliveryDate: o.scheduled_delivery_date || o.requested_delivery_date || null,
    customerName: o.customer_name || 'Unknown',
  }));

  // Customer lifetime revenue — only count completed/delivered orders
  const { data: customerData } = await supabase
    .from('order_pipeline')
    .select('customer_name, total_amount')
    .eq('is_sample', false)
    .in('status', ['completed', 'delivered']);

  const custMap = new Map<string, number>();
  (customerData || []).forEach(o => {
    const name = o.customer_name || 'Unknown';
    custMap.set(name, (custMap.get(name) || 0) + (o.total_amount || 0));
  });
  const customers = Array.from(custMap.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  // Monthly revenue (last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const mEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(getDaysInMonth(d)).padStart(2, '0')}`;
    const mRevenue = rows
      .filter(o => {
        if (!revenueStatuses.includes(o.status)) return false;
        const dt = o.scheduled_delivery_date || (o.created_at ? o.created_at.split('T')[0] : null);
        return dt && dt >= mStart && dt <= mEnd;
      })
      .reduce((s, o) => s + (o.total_amount || 0), 0);
    monthlyRevenue.push({
      month: i === 0 ? monthNames[d.getMonth()] + '*' : monthNames[d.getMonth()],
      revenue: mRevenue,
    });
  }

  // Weekly revenue (last 9 weeks)
  const weeklyRevenue: WeeklyRevenue[] = [];
  for (let i = 8; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const wsStr = weekStart.toISOString().split('T')[0];
    const weStr = weekEnd.toISOString().split('T')[0];
    const wRevenue = rows
      .filter(o => {
        if (!revenueStatuses.includes(o.status)) return false;
        const dt = o.scheduled_delivery_date || (o.created_at ? o.created_at.split('T')[0] : null);
        return dt && dt >= wsStr && dt <= weStr;
      })
      .reduce((s, o) => s + (o.total_amount || 0), 0);
    weeklyRevenue.push({
      week: `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`,
      revenue: wRevenue,
    });
  }

  return {
    monthlyRevenue,
    weeklyRevenue,
    mtd,
    mtdOrders: mtdRows.length,
    mtdCustomers: mtdCustomerSet.size,
    openPipeline,
    openOrderCount: openOrders.length,
    orders: activeOrders,
    customers,
  };
}

// Parse package size in grams from product_name (e.g. "Packaged - Strain - 3.5g Flower")
function parsePackageSizeGrams(productName: string): number {
  const match = productName.match(/(\d+(?:\.\d+)?)g\b/);
  if (match) return parseFloat(match[1]);
  // Fallback for 1oz or similar
  if (/\b1\s*oz\b/i.test(productName)) return 28;
  return 0;
}

async function fetchInventoryPipeline(): Promise<{
  funnel: FunnelStage[];
  inProcessLbs: number;
  finishedEquivLbs: number;
  packagedLbs: number;
}> {
  // Fetch bulk stage balances (weight-based: Binned, Bucked, Trimmed)
  const { data } = await supabase
    .from('v_batch_stage_balances')
    .select('stage, weight_grams, unit_count')
    .not('stage', 'is', null);

  // Fetch packaged items separately to compute weight from units × package size
  const { data: packagedItems } = await supabase
    .from('inventory_items')
    .select('product_name, on_hand_qty, unit, product_stage_id, product_stages(name)')
    .eq('unit', 'unit')
    .gt('on_hand_qty', 0)
    .neq('status', 'deleted');

  // Compute packaged weight in grams from unit-based items
  const packagedGramsComputed = (packagedItems || [])
    .filter((item: any) => item.product_stages?.name === 'Packaged')
    .reduce((total: number, item: any) => {
      const sizeG = parsePackageSizeGrams(item.product_name || '');
      return total + (sizeG * (item.on_hand_qty || 0));
    }, 0);

  const stageMap = new Map<string, number>();
  (data || []).forEach(row => {
    const stage = row.stage || 'Unknown';
    stageMap.set(stage, (stageMap.get(stage) || 0) + (Number(row.weight_grams) || 0));
  });

  // Override Packaged with computed weight from unit × package size
  if (packagedGramsComputed > 0) {
    stageMap.set('Packaged', packagedGramsComputed);
  }

  const stageColors: Record<string, string> = {
    'Trimmed': '#8B5CF6',
    'Bucked': '#0EA5E9',
    'Binned': '#10B981',
    'Packaged': '#6366F1',
  };

  // Conversion factors to get from stage weight → finished (post-trim) weight
  // Binned → needs buck (71.4%) then trim (65.2%) = 46.6%
  // Bucked → needs trim (65.2%)
  // Trimmed → already finished weight
  // Packaged → already finished (weight tracked as units, 0g in view)
  const BUCK_YIELD = 0.714;
  const TRIM_YIELD = 0.652;
  const stageConversion: Record<string, number> = {
    'Binned': BUCK_YIELD * TRIM_YIELD,  // ~46.6%
    'Bucked': TRIM_YIELD,                // ~65.2%
    'Trimmed': 1.0,                      // already done
    'Packaged': 1.0,
  };

  const pricePerLb = 2000;
  const funnel: FunnelStage[] = [];
  let inProcessGrams = 0;
  let finishedEquivGrams = 0;
  let packagedGrams = 0;

  stageMap.forEach((grams, stage) => {
    const lbs = gramsToLbs(grams);
    const conv = stageConversion[stage] || 1.0;
    const finLbs = gramsToLbs(grams * conv);
    funnel.push({
      label: stage,
      lbs,
      finishedLbs: finLbs,
      color: stageColors[stage] || '#666666',
      revenueEst: finLbs * pricePerLb,
    });
    if (stage === 'Packaged') {
      packagedGrams = grams;
    } else {
      inProcessGrams += grams;
      finishedEquivGrams += grams * conv;
    }
  });

  // Sort by pipeline stage order, not weight
  const stageOrder: Record<string, number> = { 'Binned': 0, 'Bucked': 1, 'Trimmed': 2, 'Packaged': 3 };
  funnel.sort((a, b) => (stageOrder[a.label] ?? 99) - (stageOrder[b.label] ?? 99));

  return {
    funnel,
    inProcessLbs: gramsToLbs(inProcessGrams),
    finishedEquivLbs: gramsToLbs(finishedEquivGrams),
    packagedLbs: gramsToLbs(packagedGrams),
  };
}

async function fetchProductionStats(): Promise<ProductionStats> {
  // Bucking sessions — actual columns: binned_weight_grams (input), bucked_flower_grams + bucked_smalls_grams (output)
  const { data: buckData } = await supabase
    .from('bucking_sessions')
    .select('id, binned_weight_grams, bucked_flower_grams, bucked_smalls_grams')
    .eq('session_status', 'completed');

  const buckingSessions = buckData?.length || 0;
  const buckingInput = (buckData || []).reduce((s, r) => s + (r.binned_weight_grams || 0), 0);
  const buckingOutput = (buckData || []).reduce((s, r) => s + (r.bucked_flower_grams || 0) + (r.bucked_smalls_grams || 0), 0);

  // Trim sessions — actual columns: pulled_weight (input), big_buds_grams + small_buds_grams (output)
  const { data: trimData } = await supabase
    .from('trim_sessions')
    .select('id, pulled_weight, big_buds_grams, small_buds_grams')
    .eq('session_status', 'completed');

  const trimSessions = trimData?.length || 0;
  const trimInput = (trimData || []).reduce((s, r) => s + (r.pulled_weight || 0), 0);
  const trimOutput = (trimData || []).reduce((s, r) => s + (r.big_buds_grams || 0) + (r.small_buds_grams || 0), 0);

  return {
    buckingSessions,
    buckingInput: gramsToLbs(buckingInput),
    buckingOutput: gramsToLbs(buckingOutput),
    trimSessions,
    trimInput: gramsToLbs(trimInput),
    trimOutput: gramsToLbs(trimOutput),
    buckingYield: buckingInput > 0 ? (buckingOutput / buckingInput) * 100 : 0,
    trimYield: trimInput > 0 ? (trimOutput / trimInput) * 100 : 0,
  };
}

async function fetchCultivationData(): Promise<{
  cultivation: CultivationSummary;
  activeStrains: ActiveStrain[];
  harvestPipeline: HarvestWindow[];
  vegStrains: VegStrain[];
  dryRooms: DryRoom[];
}> {
  // Plant groups — columns: id, name, strain_id, grow_room_id, plant_count, growth_stage, estimated_harvest_date, etc.
  const { data: groups } = await supabase
    .from('plant_groups')
    .select('id, plant_count, growth_stage, strains(name)')
    .in('growth_stage', ['clone', 'veg', 'flower']);

  const flowerCount = (groups || []).filter(g => g.growth_stage === 'flower').reduce((s, g) => s + g.plant_count, 0);
  const vegCount = (groups || []).filter(g => g.growth_stage === 'veg').reduce((s, g) => s + g.plant_count, 0);
  const cloneCount = (groups || []).filter(g => g.growth_stage === 'clone').reduce((s, g) => s + g.plant_count, 0);

  // Active strains from batch stage balances
  const { data: strainData } = await supabase
    .from('v_batch_stage_balances')
    .select('strain, stage, weight_grams')
    .not('stage', 'is', null);

  const strainMap = new Map<string, { lbs: number; stage: string }>();
  (strainData || []).forEach(row => {
    const name = row.strain || 'Unknown';
    const existing = strainMap.get(name);
    const lbs = gramsToLbs(Number(row.weight_grams) || 0);
    if (existing) {
      existing.lbs += lbs;
    } else {
      const stage = row.stage === 'Packaged' ? 'clone' : row.stage === 'Trimmed' ? 'cure' : 'flower';
      strainMap.set(name, { lbs, stage });
    }
  });

  const activeStrains: ActiveStrain[] = Array.from(strainMap.entries())
    .map(([name, d]) => ({ name, lbs: d.lbs, stage: d.stage as 'flower' | 'cure' | 'clone' }))
    .sort((a, b) => b.lbs - a.lbs);

  // Veg pipeline strains
  const vegGroups = (groups || []).filter(g => g.growth_stage === 'veg');
  const vegMap = new Map<string, number>();
  vegGroups.forEach((g: PlantGroupWithStrain) => {
    const name = g.strains?.name || 'Unknown';
    vegMap.set(name, (vegMap.get(name) || 0) + g.plant_count);
  });
  const vegStrains: VegStrain[] = Array.from(vegMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Harvest pipeline from flower rooms
  // plant_groups: grow_room_id (FK), estimated_harvest_date
  const { data: flowerGroups } = await supabase
    .from('plant_groups')
    .select('id, plant_count, growth_stage, grow_room_id, estimated_harvest_date, strains(name), grow_rooms(name, room_code)')
    .eq('growth_stage', 'flower')
    .order('estimated_harvest_date');

  // Group by room + estimated harvest date to build harvest windows
  const windowMap = new Map<string, { room: string; date: string; plants: number; strains: Set<string> }>();
  (flowerGroups || []).forEach((g: any) => {
    const roomCode = g.grow_rooms?.room_code || g.grow_rooms?.name || 'Unknown';
    const date = g.estimated_harvest_date || 'TBD';
    const key = `${roomCode}-${date}`;
    const existing = windowMap.get(key);
    const strainName = g.strains?.name || 'Unknown';
    if (existing) {
      existing.plants += g.plant_count;
      existing.strains.add(strainName);
    } else {
      windowMap.set(key, { room: roomCode, date, plants: g.plant_count, strains: new Set([strainName]) });
    }
  });

  // Yield model: sqft-based, NOT plant-count-based.
  // Canopy area determines yield; plant count is irrelevant.
  // 65g/sqft avg × 672 sqft per room = 43,680g = 96.3 lbs dry per room.
  // (FLW-10 actual: 90.7g/sqft = 134.4 lbs, but 65g is conservative avg)
  const GRAMS_PER_SQFT = 65;
  const CANOPY_SQFT_PER_ROOM = 672;
  const EST_DRY_GRAMS_PER_ROOM = GRAMS_PER_SQFT * CANOPY_SQFT_PER_ROOM; // 43,680g

  const harvestPipeline: HarvestWindow[] = Array.from(windowMap.values())
    .map(w => {
      const estDryLbs = gramsToLbs(EST_DRY_GRAMS_PER_ROOM);
      const isOverdue = w.date !== 'TBD' && new Date(w.date) < new Date();
      return {
        room: w.room,
        date: w.date,
        strainCount: w.strains.size,
        plants: w.plants,
        estDryLbs,
        isOverdue,
        dateColor: isOverdue ? '#B81D24' : '#F59E0B',
        barColor: '#F43F5E',
      };
    })
    .sort((a, b) => (a.date || 'Z').localeCompare(b.date || 'Z'))
    .slice(0, 6);

  // Dry rooms — from the dedicated dry_rooms table (FK: harvest_sessions.dry_room_id → dry_rooms.id)
  const { data: dryRoomRecords } = await supabase
    .from('dry_rooms')
    .select('id, name, room_code, is_active')
    .eq('is_active', true)
    .order('room_code') as { data: any[] | null };

  const dryRoomList = (dryRoomRecords && dryRoomRecords.length > 0)
    ? dryRoomRecords
    : [];

  // Get active drying sessions with their dry_room_id
  const { data: dryingHarvests } = await supabase
    .from('harvest_sessions')
    .select('id, session_status, wet_weight_grams, created_at, dry_room_id, plant_groups(strains(name))')
    .eq('session_status', 'drying') as { data: any[] | null };

  const dryRooms: DryRoom[] = dryRoomList.map((room: any) => {
    const roomName = room.room_code || room.name;
    const session = (dryingHarvests || []).find((h: any) => h.dry_room_id === room.id);
    if (session) {
      const wet = gramsToLbs(session.wet_weight_grams || 0);
      const strainName = session.plant_groups?.strains?.name || '';
      const startDate = session.created_at ? new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      return {
        name: roomName,
        status: 'drying' as const,
        detail: `${strainName ? strainName + ' · ' : ''}${wet.toFixed(0)} lbs wet`,
        subDetail: startDate ? `Since ${startDate}` : undefined,
      };
    }
    return { name: roomName, status: 'available' as const };
  });

  // Count harvested plants
  const { data: harvestedData } = await supabase
    .from('harvest_sessions')
    .select('plant_count_harvested')
    .in('session_status', ['completed', 'drying']);

  const harvestedCount = (harvestedData || []).reduce((s, h) => s + (h.plant_count_harvested || 0), 0);

  return {
    cultivation: {
      flowerCount,
      vegCount: vegCount + cloneCount,
      harvestedCount,
      totalPlants: flowerCount + vegCount + cloneCount,
    },
    activeStrains,
    harvestPipeline,
    vegStrains,
    dryRooms,
  };
}

// ── Hook ───────────────────────────────────────────────────────

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [revenueResult, inventoryResult, productionResult, cultivationResult] = await Promise.all([
        fetchRevenueData(),
        fetchInventoryPipeline(),
        fetchProductionStats(),
        fetchCultivationData(),
      ]);

      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = getDaysInMonth(now);
      const target = 158000;

      const pastMonths = revenueResult.monthlyRevenue.slice(0, -1).filter(m => m.revenue > 0);
      const rollingAvg = pastMonths.length > 0
        ? pastMonths.reduce((s, m) => s + m.revenue, 0) / pastMonths.length
        : 0;
      const bestMonth = Math.max(...revenueResult.monthlyRevenue.map(m => m.revenue));

      const harvestIncomingLbs = cultivationResult.harvestPipeline.reduce((s, w) => s + w.estDryLbs, 0);

      setData({
        revenueGoal: {
          target,
          mtd: revenueResult.mtd,
          pct: target > 0 ? (revenueResult.mtd / target) * 100 : 0,
          dayOfMonth,
          daysInMonth,
          dayPct: (dayOfMonth / daysInMonth) * 100,
          rollingAvg,
          bestMonth,
          openPipeline: revenueResult.openPipeline,
          openOrderCount: revenueResult.openOrderCount,
        },
        kpi: {
          revenueMTD: revenueResult.mtd,
          mtdOrders: revenueResult.mtdOrders,
          mtdCustomers: revenueResult.mtdCustomers,
          openPipeline: revenueResult.openPipeline,
          openOrderCount: revenueResult.openOrderCount,
          inventoryInProcessLbs: inventoryResult.inProcessLbs,
          finishedEquivLbs: inventoryResult.finishedEquivLbs,
          packagedLbs: inventoryResult.packagedLbs,
          harvestIncomingLbs,
          harvestWindows: cultivationResult.harvestPipeline.length,
        },
        funnel: inventoryResult.funnel,
        orders: revenueResult.orders,
        customers: revenueResult.customers,
        production: productionResult,
        cultivation: cultivationResult.cultivation,
        dryRooms: cultivationResult.dryRooms,
        activeStrains: cultivationResult.activeStrains,
        harvestPipeline: cultivationResult.harvestPipeline,
        vegStrains: cultivationResult.vegStrains,
        monthlyRevenue: revenueResult.monthlyRevenue,
        weeklyRevenue: revenueResult.weeklyRevenue,
      });
      setError(null);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plant_groups' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
}
