// Cycle phase markers per stage type. Position is percent across the cycle.
// Source: cultivo_molecule_phase_hero_v1 (brain row), Cult Cannabis calibration.
// v2 makes these strain-tunable; v1 is fixed per stage.

export type PhaseMarker = { label: string; position: number };

export const CYCLE_PHASE_MARKERS: Record<string, PhaseMarker[]> = {
  flower: [
    { label: 'Stretch', position: 33 },
    { label: 'Bulk', position: 57 },
    { label: 'Flush', position: 71 },
    { label: 'Ripen', position: 90 },
  ],
  veg: [
    { label: 'Establish', position: 33 },
    { label: 'Growth', position: 66 },
    { label: 'Flip', position: 95 },
  ],
  clone: [
    { label: 'Misting', position: 33 },
    { label: 'Transplant', position: 95 },
  ],
  mother: [],
};

export const CYCLE_DEFAULTS: Record<string, number> = {
  flower: 63,
  veg: 42,
  clone: 21,
  mother: 0,
  mixed: 42,
};
