import type {
  GrowRoom,
  DryRoom,
  RoomSection,
  RoomTable,
  PlantGroup,
  HarvestSession,
  BinningSession,
} from '@/features/cultivation/types';

export function makeGrowRoom(overrides: Partial<GrowRoom> = {}): GrowRoom {
  return {
    id: 'room-001',
    name: 'Flower Room A',
    room_code: 'FR-A',
    room_type: 'flower',
    capacity_plants: 100,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'user-123',
    ...overrides,
  };
}

export function makeDryRoom(overrides: Partial<DryRoom> = {}): DryRoom {
  return {
    id: 'dry-001',
    name: 'Dry Room 1',
    room_code: 'DR-1',
    capacity_lbs: 50,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'user-123',
    ...overrides,
  };
}

export function makeRoomSection(overrides: Partial<RoomSection> = {}): RoomSection {
  return {
    id: 'section-001',
    room_table_id: 'table-001',
    section_label: 'A1',
    section_sqft: 25,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'user-123',
    flip_date: null,
    projected_harvest_date: null,
    ...overrides,
  };
}

export function makeRoomTable(overrides: Partial<RoomTable> = {}): RoomTable {
  return {
    id: 'table-001',
    grow_room_id: 'room-001',
    table_number: 1,
    table_name: 'Table 1',
    total_sqft: 100,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'user-123',
    sections: [],
    ...overrides,
  };
}

export function makePlantGroup(overrides: Partial<PlantGroup> = {}): PlantGroup {
  return {
    id: 'pg-001',
    name: null,
    strain_id: 'strain-001',
    grow_room_id: 'room-001',
    mother_plant_group_id: null,
    room_table_id: null,
    room_section_id: null,
    is_mother: false,
    plant_count: 24,
    growth_stage: 'veg',
    stage_entered_at: '2026-01-01T00:00:00Z',
    planted_date: '2026-01-01',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'user-123',
    updated_at: '2026-01-01T00:00:00Z',
    strains: { name: 'Blue Pave', abbreviation: 'BP' },
    grow_rooms: { name: 'Flower Room A', room_code: 'FR-A' },
    ...overrides,
  };
}

export function makeHarvestSession(overrides: Partial<HarvestSession> = {}): HarvestSession {
  return {
    id: 'hs-001',
    plant_group_id: 'pg-001',
    harvest_date: '2026-02-19',
    wet_weight_grams: 5000,
    plant_count_harvested: 24,
    adjusted_weight_grams: null,
    adjustment_reason: null,
    batch_registry_id: null,
    session_status: 'active',
    completed_at: null,
    completed_by: null,
    cancelled_at: null,
    cancelled_by: null,
    notes: null,
    created_at: '2026-02-19T00:00:00Z',
    created_by: 'user-123',
    plant_groups: {
      strain_id: 'strain-001',
      grow_room_id: 'room-001',
      strains: { name: 'Blue Pave', abbreviation: 'BP' },
    },
    ...overrides,
  };
}

export function makeBinningSession(overrides: Partial<BinningSession> = {}): BinningSession {
  return {
    id: 'bs-001',
    harvest_session_id: 'hs-001',
    dry_room_id: 'dry-001',
    batch_registry_id: 'batch-001',
    dry_weight_grams: 3500,
    bin_date: '2026-02-19',
    session_status: 'active',
    completed_at: null,
    completed_by: null,
    cancelled_at: null,
    cancelled_by: null,
    notes: null,
    created_at: '2026-02-19T00:00:00Z',
    created_by: 'user-123',
    dry_rooms: { name: 'Dry Room 1', room_code: 'DR-1' },
    batch_registry: { batch_number: '260219-BP' },
    ...overrides,
  };
}
