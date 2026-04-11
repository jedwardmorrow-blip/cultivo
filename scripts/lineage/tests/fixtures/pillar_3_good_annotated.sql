-- cultops:allow-retroactive audit_reconciliation
-- Pillar 3 good path: retroactive write with an approved reason code.
UPDATE batch_lifecycle_events
   SET quantities_g = 1250.0
 WHERE id = '00000000-0000-0000-0000-000000000000';
