-- Pillar 3 violation: updating a fact column on an append-only table
-- with no retroactive annotation.
UPDATE batch_lifecycle_events
   SET to_state = 'packaged',
       quantities_g = 1250.0
 WHERE id = '00000000-0000-0000-0000-000000000000';
