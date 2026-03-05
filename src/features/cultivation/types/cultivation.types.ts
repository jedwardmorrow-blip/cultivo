/**
 * Interim Cultivation Types
 *
 * These are manually-specified types matching the CULTIVATION-ARCHITECTURE.md specification.
 * After C-2 migration runs and creates the cultivation tables, regenerate database.types.ts
 * via `npm run types:generate` and convert these to derive from Database['public']['Tables']
 * following the pattern in batch.types.ts.
 *
 * C-5A: Added RoomSection, RoomTable, UpdateRoomSectionInput for run date tracking.
 * C-5B: Added room_table_id/room_section_id to PlantGroup; added CreateRoomTableInput,
 *        UpdateRoomTableInput, CreateRoomSectionInput, UpdatePlantGroupPlacementInput,
 *        FlipRoomInput new service types.
 * D-2/D-3: Added BinningSessionStatus, DryRoom, BinningSession, CreateDryRoomInput,
 *           UpdateDryRoomInput, CreateBinningSessionInput.
 * E-1: Added IndividualPlant, AddIndividualPlantInput, BulkImportPlantResult;
 *      added batch_registry_id to PlantGroup.
 * D-9: Removed group_number from PlantGroup. Batch number (from batch_registry) is
 *      the sole human-readable identifier throughout the UI.
 */

export type GrowthStage = 'clone' | 'veg' | 'flower' | 'harvested';
export type RoomType = 'clone' | 'veg' | 'flower' | 'mother' | 'mixed';
export type PlantSourceType = 'clone' | 'seed';
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
  name: string | null;
  strain_id: string;
  grow_room_id: string;
  mother_plant_group_id: string | null;
  room_table_id: string | null;
  room_section_id: string | null;
  batch_registry_id: string | null;
  source_type: PlantSourceType;
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
  mother_group?: { id: string; growth_stage: GrowthStage; batch_registry?: { batch_number: string } | null; individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[] };
  room_tables?: { table_number: number; table_name: string | null } | null;
  room_sections?: { section_label: string } | null;
  batch_registry?: { batch_number: string; clone_date: string | null } | null;
  cut_sessions?: PlantGroupCutSession[];
  individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[];
}

export interface PlantGroupCutSession {
  id: string;
  plant_group_id: string;
  mother_plant_group_id: string;
  cut_count: number;
  cut_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  mother_group?: {
    id: string;
    growth_stage: GrowthStage;
    strains?: { name: string; abbreviation: string | null };
    batch_registry?: { batch_number: string } | null;
    individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[];
  };
}

export type CreatePlantGroupCutSessionInput = {
  plant_group_id: string;
  mother_plant_group_id: string;
  cut_count: number;
  cut_date?: string;
  notes?: string;
};

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

export interface HarvestWeightEntry {
  id: string;
  harvest_session_id: string;
  weight_grams: number;
  plant_count: number;
  entry_order: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type CreateHarvestWeightEntryInput = Pick<HarvestWeightEntry, 'harvest_session_id' | 'weight_grams' | 'plant_count'> &
  Partial<Pick<HarvestWeightEntry, 'entry_order' | 'notes'>>;

export interface HarvestSession {
  id: string;
  plant_group_id: string;
  harvest_date: string;
  wet_weight_grams: number;
  waste_grams: number | null;
  plant_count_harvested: number;
  adjusted_weight_grams: number | null;
  adjustment_reason: string | null;
  batch_registry_id: string | null;
  grow_room_id: string | null;
  dry_room_id: string | null;
  session_status: HarvestSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  plant_groups?: {
    strain_id: string;
    grow_room_id: string;
    strains?: { name: string; abbreviation: string | null };
    grow_rooms?: { room_code: string };
  };
  grow_rooms?: { name: string; room_code: string };
  dry_rooms?: { name: string; room_code: string };
  batch_registry?: { batch_number: string };
  weight_entries?: HarvestWeightEntry[];
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

export type CreateRoomTableInput = {
  grow_room_id: string;
  table_number: number;
  table_name?: string | null;
  total_sqft?: number | null;
};

export type UpdateRoomTableInput = Partial<{
  table_name: string | null;
  total_sqft: number | null;
  is_active: boolean;
}>;

export type CreateRoomSectionInput = {
  room_table_id: string;
  section_label: string;
  section_sqft?: number | null;
};

export type UpdateRoomSectionInput = Partial<Pick<RoomSection, 'flip_date' | 'projected_harvest_date' | 'section_sqft' | 'is_active'>>;

export type UpdatePlantGroupPlacementInput = {
  room_table_id: string | null;
  room_section_id: string | null;
};

export type FlipRoomInput = {
  grow_room_id: string;
  flip_date: string;
};

export type CreatePlantGroupInput = Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'plant_count'> &
  Partial<Pick<PlantGroup, 'name' | 'planted_date' | 'notes' | 'is_mother' | 'mother_plant_group_id' | 'source_type'>> & {
    cut_sessions?: Omit<CreatePlantGroupCutSessionInput, 'plant_group_id'>[];
  };

export type CreateHarvestSessionInput = Pick<HarvestSession, 'plant_group_id' | 'harvest_date' | 'wet_weight_grams' | 'plant_count_harvested'> &
  Partial<Pick<HarvestSession, 'notes' | 'waste_grams' | 'grow_room_id'>>;

export type BinningSessionStatus = 'active' | 'completed' | 'cancelled';

export interface DryRoom {
  id: string;
  name: string;
  room_code: string;
  capacity_lbs: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface BinEntry {
  id: string;
  binning_session_id: string;
  bin_weight_grams: number;
  entry_order: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type CreateBinEntryInput = Pick<BinEntry, 'binning_session_id' | 'bin_weight_grams'> &
  Partial<Pick<BinEntry, 'entry_order' | 'notes'>>;

export interface BinningSession {
  id: string;
  harvest_session_id: string;
  dry_room_id: string;
  batch_registry_id: string;
  dry_weight_grams: number;
  water_loss_grams: number | null;
  bin_date: string;
  session_status: BinningSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  harvest_sessions?: Pick<HarvestSession, 'harvest_date' | 'wet_weight_grams' | 'adjusted_weight_grams'> & {
    plant_groups?: {
      strains?: { name: string; abbreviation: string | null };
    };
  };
  dry_rooms?: { name: string; room_code: string };
  batch_registry?: { batch_number: string };
}

export type CreateDryRoomInput = Pick<DryRoom, 'name' | 'room_code'> &
  Partial<Pick<DryRoom, 'capacity_lbs'>>;

export type UpdateDryRoomInput = Partial<Pick<DryRoom, 'name' | 'capacity_lbs' | 'is_active'>>;

export type CreateBinningSessionInput = Pick<BinningSession, 'harvest_session_id' | 'dry_room_id' | 'batch_registry_id' | 'bin_date'> &
  Partial<Pick<BinningSession, 'dry_weight_grams' | 'notes'>>;

export interface IndividualPlant {
  id: string;
  plant_group_id: string;
  state_plant_id: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type AddIndividualPlantInput = {
  plant_group_id: string;
  state_plant_id: string;
  notes?: string;
};

export type BulkImportPlantResult = {
  imported: number;
  skipped: string[];
  errors: { state_plant_id: string; reason: string }[];
};
