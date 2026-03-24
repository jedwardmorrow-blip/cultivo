/**
 * Types for the Production Planner feature.
 * Mirrors v_room_occupancy and v_strain_cultivation_stats DB views.
 */

export interface RoomOccupancy {
  room_id: string;
  room_name: string;
  room_type: string;
  capacity_plants: number | null;
  square_footage: number | null;
  strain_id: string | null;
  strain_name: string | null;
  plant_count: number | null;
  growth_stage: string | null;
  earliest_planted_date: string | null;
  estimated_harvest_date: string | null;
  stage_entered_at: string | null;
  days_in_stage: number | null;
  is_mother: boolean | null;
  total_plants: number;
  strain_count: number;
  capacity_utilization_pct: number | null;
}

export interface StrainCultivationStats {
  strain_id: string;
  strain_name: string;
  display_name: string;
  dominance_type: string | null;
  category: string | null;
  is_active: boolean;
  flowering_time_days: number | null;
  veg_days_avg: number | null;
  feed_group: string | null;
  flowering_time_class: string | null;
  harvest_count: number | null;
  avg_wet_weight_per_plant_g: number | null;
  last_harvest_date: string | null;
  avg_wet_g_per_sqft: number | null;
  avg_big_bud_pct: number | null;
  avg_small_bud_pct: number | null;
  avg_trim_pct: number | null;
  avg_waste_pct: number | null;
  avg_trim_grams_per_hour: number | null;
  trim_session_count: number | null;
  avg_rosin_yield_pct: number | null;
  press_run_count: number | null;
  avg_thc_pct: number | null;
  avg_total_terpenes_mg_g: number | null;
  coa_count: number | null;
  demand_total_units: number | null;
  demand_unassigned_units: number | null;
  order_count: number | null;
  conversion_confidence: string | null;
  conversion_sessions: number | null;
}

/** Aggregated room data for the calendar timeline */
export interface CalendarRoom {
  room_id: string;
  room_name: string;
  room_code: string;
  room_type: string;
  capacity_plants: number | null;
  square_footage: number | null;
  total_plants: number;
  strain_count: number;
  capacity_utilization_pct: number | null;
  strains: CalendarRoomStrain[];
}

export interface CalendarRoomStrain {
  strain_id: string;
  strain_name: string;
  plant_count: number;
  growth_stage: string;
  earliest_planted_date: string | null;
  estimated_harvest_date: string | null;
  stage_entered_at: string | null;
  days_in_stage: number | null;
  is_mother: boolean;
}

/** Room type sort order matching RoomCalendar.tsx */
export const ROOM_TYPE_ORDER: Record<string, number> = {
  mother: 0,
  clone: 1,
  veg: 2,
  flower: 3,
  mixed: 4,
};

/** Stage hex colors for SVG rendering */
export const STAGE_HEX: Record<string, string> = {
  clone: '#0EA5E9',
  seedling: '#0EA5E9',
  veg: '#10B981',
  flower: '#F43F5E',
  mother: '#D97706',
  harvested: '#6B7280',
};
