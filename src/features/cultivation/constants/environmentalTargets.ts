// Static environmental targets per room type. Manual values used until
// sensor integration lands (Aroya, Trolmaster, etc per cultivation_capability_matrix).
// Source: cultivation_command_center_brief_v1 v1.1 amendment.
// Cells render with a 'manual' tag; layout stays stable when live readings light up.

export type EnvTarget = {
  temp_f: string;
  rh_pct: string;
  vpd_kpa: string;
  co2_ppm: string;
};

export const ENV_TARGETS: Record<string, EnvTarget> = {
  flower: { temp_f: '76-82', rh_pct: '50-58', vpd_kpa: '1.1-1.4', co2_ppm: '1100-1400' },
  veg:    { temp_f: '74-78', rh_pct: '60-65', vpd_kpa: '0.8-1.0', co2_ppm: '800-1000' },
  clone:  { temp_f: '76-78', rh_pct: '70-78', vpd_kpa: '0.5-0.7', co2_ppm: 'ambient' },
  mother: { temp_f: '74-76', rh_pct: '60-65', vpd_kpa: '0.8-1.0', co2_ppm: 'ambient' },
  mixed:  { temp_f: '74-78', rh_pct: '55-65', vpd_kpa: '0.9-1.2', co2_ppm: '900-1200' },
};

export function getEnvTarget(roomType: string): EnvTarget {
  return ENV_TARGETS[roomType] ?? ENV_TARGETS.mixed;
}
