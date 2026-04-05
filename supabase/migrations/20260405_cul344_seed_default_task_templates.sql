-- CUL-344 (R-3): Seed 5 standard cultivation task templates per CUL-328 design spec
-- Idempotent: only inserts if a template with the same name doesn't already exist.
-- Users can edit or delete these after seeding; they're seed data, not locked.

INSERT INTO room_schedule_templates (name, description, room_type, is_default, schedules)
SELECT * FROM (
  VALUES
    (
      'Standard Flower Weekly',
      'Standard flower-room weekly schedule: defoliation, IPM spray, scouting, feeding, saturation check.',
      'flower',
      true,
      '[
        {"task_type":"defoliation","recurrence":"weekly","day_of_week":[1],"priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"ipm_spray","recurrence":"weekly","day_of_week":[2],"priority":"high","scheduling_mode":"calendar"},
        {"task_type":"scouting","recurrence":"weekly","day_of_week":[3],"priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"saturation_check","recurrence":"daily","priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"batch_tank_mix","recurrence":"weekly","day_of_week":[4],"priority":"high","scheduling_mode":"calendar"}
      ]'::jsonb
    ),
    (
      'Standard Veg Weekly',
      'Standard veg-room weekly schedule: training, IPM spray, scouting, feeding.',
      'veg',
      true,
      '[
        {"task_type":"training","recurrence":"weekly","day_of_week":[1,4],"priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"ipm_spray","recurrence":"weekly","day_of_week":[2],"priority":"high","scheduling_mode":"calendar"},
        {"task_type":"scouting","recurrence":"weekly","day_of_week":[3],"priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"saturation_check","recurrence":"daily","priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"batch_tank_mix","recurrence":"weekly","day_of_week":[4],"priority":"high","scheduling_mode":"calendar"}
      ]'::jsonb
    ),
    (
      'Mother Room Maintenance',
      'Mother-room weekly schedule: clone cutting, IPM spray, scouting, feeding.',
      'mother',
      true,
      '[
        {"task_type":"clone_cutting","recurrence":"weekly","day_of_week":[1],"priority":"high","scheduling_mode":"calendar"},
        {"task_type":"ipm_spray","recurrence":"weekly","day_of_week":[2],"priority":"high","scheduling_mode":"calendar"},
        {"task_type":"scouting","recurrence":"weekly","day_of_week":[3],"priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"batch_tank_mix","recurrence":"weekly","day_of_week":[4],"priority":"high","scheduling_mode":"calendar"}
      ]'::jsonb
    ),
    (
      'Clone Room Basics',
      'Clone-room schedule: misting, scouting, transplant readiness check.',
      'clone',
      true,
      '[
        {"task_type":"saturation_check","recurrence":"daily","priority":"high","scheduling_mode":"calendar"},
        {"task_type":"scouting","recurrence":"weekly","day_of_week":[3],"priority":"medium","scheduling_mode":"calendar"},
        {"task_type":"transplant","recurrence":"weekly","day_of_week":[5],"priority":"high","scheduling_mode":"calendar"}
      ]'::jsonb
    ),
    (
      'Flower Phase-Day Schedule',
      'Phase-day based flower schedule: defoliation at week 3, heavy irrigation audit weeks 5-7, pre-harvest flush week 8.',
      'flower',
      false,
      '[
        {"task_type":"defoliation","recurrence":"daily","priority":"high","scheduling_mode":"phase_day","phase_day_start":21,"phase_day_end":21},
        {"task_type":"irrigation_audit","recurrence":"daily","priority":"medium","scheduling_mode":"phase_day","phase_day_start":35,"phase_day_end":49,"interval_days":7},
        {"task_type":"batch_tank_mix","recurrence":"daily","priority":"high","scheduling_mode":"phase_day","phase_day_start":56,"phase_day_end":63}
      ]'::jsonb
    )
) AS seed(name, description, room_type, is_default, schedules)
WHERE NOT EXISTS (
  SELECT 1 FROM room_schedule_templates rst WHERE rst.name = seed.name
);
