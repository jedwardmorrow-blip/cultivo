-- Pillar 3 good path: updating a lifecycle column on an append-only table
-- is allowed. (Hypothetical — in practice lifecycle columns live on
-- inventory_audits, not on batch_lifecycle_events. This fixture exercises
-- the "touched_facts is empty" branch.)
UPDATE batch_lifecycle_events
   SET notes = 'clarified by operator'
 WHERE id = '00000000-0000-0000-0000-000000000000';
