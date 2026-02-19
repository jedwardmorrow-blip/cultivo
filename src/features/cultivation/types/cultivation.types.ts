/**
 * Interim Cultivation Types
 *
 * These are manually-specified types matching the CULTIVATION-ARCHITECTURE.md specification.
 * After C-2 migration runs and creates the cultivation tables, regenerate database.types.ts
 * via `npm run types:generate` and convert these to derive from Database['public']['Tables']
 * following the pattern in batch.types.ts.
 *
 * C-5A: Added RoomSection, RoomTable, UpdateRoomSectionInput for run date tracking.
 */

export type GrowthStage = 'clone' | 'veg' | 'flower' | 'harvested';
export type RoomType = 'clone' | 'veg' | 'flower' | 'mother' | 'mixed';
export type HarvestSessionStatus = 'active' | 'completed' | 'cancelled';

export interface GrowRoom {
  id: string;
  name: string;
  room_code: string;
  room_type: RoomType;
  capacity_plants: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface PlantGroup {
  id: string;
  group_number: string;
  name: string | null;
  strain_id: string;
  grow_room_id: string;
  mother_plant_group_id: string | null;
  is_mother: boolean;
  plant_count: number;
  growth_stage: GrowthStage;
  stage_entered_at: string;
  planted_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  strains?: { name: string; abbreviation: string | null };
  grow_rooms?: { name: string; room_code: string };
  mother_group?: Pick<PlantGroup, 'id' | 'group_number' | 'growth_stage'>;
}

export interface PlantGroupStageHistory {
  id: string;
  plant_group_id: string;
  from_stage: GrowthStage | null;
  to_stage: GrowthStage;
  transitioned_at: string;
  transitioned_by: string | null;
  notes: string | null;
}

export interface PlantGroupRoomHistory {
  id: string;
  plant_group_id: string;
  from_room_id: string;
  to_room_id: string;
  moved_at: string;
  moved_by: string | null;
  notes: string | null;
  from_room?: { name: string; room_code: string };
  to_room?: { name: string; room_code: string };
}

export interface HarvestSession {
  id: string;
  plant_group_id: string;
  harvest_date: string;
  wet_weight_grams: number;
  plant_count_harvested: number;
  adjusted_weight_grams: number | null;
  adjustment_reason: string | null;
  batch_registry_id: string | null;
  session_status: HarvestSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  plant_groups?: {
    group_number: string;
    strain_id: string;
    grow_room_id: string;
    strains?: { name: string; abbreviation: string | null };
    grow_rooms?: { room_code: string };
  };
  batch_registry?: { batch_number: string };
}

export interface RoomSection {
  id: string;
  room_table_id: string;
  section_label: string;
  section_sqft: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  flip_date: string | null;
  projected_harvest_date: string | null;
}

export interface RoomTable {
  id: string;
  grow_room_id: string;
  table_number: number;
  table_name: string | null;
  total_sqft: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  sections: RoomSection[];
}

export type CreateGrowRoomInput = Pick<GrowRoom, 'name' | 'room_code' | 'room_type'> &
  Partial<Pick<GrowRoom, 'capacity_plants'>>;

export type UpdateGrowRoomInput = Partial<Pick<GrowRoom, 'name' | 'room_type' | 'capacity_plants' | 'is_active'>>;

export type UpdateRoomSectionInput = Partial<Pick<RoomSection, 'flip_date' | 'projected_harvest_date' | 'section_sqft' | 'is_active'>>;

export type CreatePlantGroupInput = Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'plant_count'> &
  Partial<Pick<PlantGroup, 'name' | 'planted_date' | 'notes' | 'is_mother' | 'mother_plant_group_id'>>;

export type CreateHarvestSessionInput = Pick<HarvestSession, 'plant_group_id' | 'harvest_date' | 'wet_weight_grams' | 'plant_count_harvested'> &
  Partial<Pick<HarvestSession, 'notes'>>;
