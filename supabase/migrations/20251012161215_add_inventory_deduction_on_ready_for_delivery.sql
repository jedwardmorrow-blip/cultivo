/*
  # Inventory Deduction on Ready for Delivery

  ## Overview
  This migration implements automatic inventory deduction when orders transition to "ready_for_delivery" status.
  It ensures inventory is only deducted once, prevents double-commits, and supports rollback when orders
  are moved back to earlier statuses.

  ## Key Features

  1. **Automatic Inventory Deduction**
     - Triggers when order status changes to "ready_for_delivery"
     - Deducts allocated inventory from internal_bulk_inventory and internal_packaged_inventory
     - Transitions allocations from "confirmed/reserved" to "consumed"
     - Only processes allocations that haven't been consumed yet

  2. **Inventory Restoration on Rollback**
     - Automatically restores inventory when order moves from "ready_for_delivery" back to earlier status
     - Transitions allocations from "consumed" back to "confirmed"
     - Ensures inventory quantities are correctly restored

  3. **Validation Rules**
     - Orders cannot be marked "ready_for_delivery" unless all items have complete fulfillment checklists
     - Completed orders cannot have inventory re-deducted
     - Prevents negative inventory quantities

  4. **Audit Trail**
     - Creates inventory_transactions table to track all deductions and restorations
     - Logs the reason, timestamp, and related order for every inventory change

  ## Tables Modified
  - internal_bulk_inventory: weight_grams reduced based on allocations
  - internal_packaged_inventory: units_count reduced based on allocations
  - order_item_allocations: status transitions between confirmed/reserved and consumed

  ## New Tables
  - inventory_transactions: Audit log for all inventory movements

  ## Security
  - Enable RLS on inventory_transactions table
  - Add policies for authenticated users
*/

-- Create inventory_transactions table for audit trail
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  allocation_id uuid REFERENCES order_item_allocations(id) ON DELETE SET NULL,
  inventory_type text NOT NULL,
  inventory_id uuid NOT NULL,
  strain text NOT NULL,
  product_type text NOT NULL,
  quantity_change numeric NOT NULL,
  previous_quantity numeric,
  new_quantity numeric,
  transaction_reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('deduction', 'restoration', 'adjustment', 'waste')),
  CONSTRAINT valid_inventory_type CHECK (inventory_type IN ('bulk', 'packaged'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_order ON inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_inventory ON inventory_transactions(inventory_type, inventory_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON inventory_transactions(created_at);

-- Enable Row Level Security
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view inventory_transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory_transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to validate order can be marked ready for delivery
CREATE OR REPLACE FUNCTION validate_ready_for_delivery(order_id_param uuid)
RETURNS boolean AS $$
DECLARE
  all_items_ready boolean;
  order_status_current text;
BEGIN
  -- Check current order status
  SELECT status INTO order_status_current
  FROM orders
  WHERE id = order_id_param;

  -- Don't allow if already completed
  IF order_status_current = 'completed' THEN
    RAISE EXCEPTION 'Cannot mark completed orders as ready for delivery';
  END IF;

  -- Check if all order items have complete fulfillment checklists
  SELECT BOOL_AND(
    inventory_allocated = true
    AND trim_complete = true
    AND packaging_complete = true
    AND labeling_complete = true
    AND coa_attached = true
  ) INTO all_items_ready
  FROM order_fulfillment_checklist ofc
  JOIN order_items oi ON oi.id = ofc.order_item_id
  WHERE oi.order_id = order_id_param;

  IF all_items_ready IS NULL OR all_items_ready = false THEN
    RAISE EXCEPTION 'All order items must have complete fulfillment checklists before marking ready for delivery';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct inventory for order allocations
CREATE OR REPLACE FUNCTION deduct_inventory_for_order(order_id_param uuid)
RETURNS void AS $$
DECLARE
  allocation_record RECORD;
  previous_qty numeric;
  new_qty numeric;
BEGIN
  -- Process all confirmed or reserved allocations for this order
  FOR allocation_record IN
    SELECT *
    FROM order_item_allocations
    WHERE order_id = order_id_param
    AND allocation_status IN ('reserved', 'confirmed')
  LOOP
    IF allocation_record.inventory_type = 'bulk' THEN
      -- Deduct from bulk inventory
      UPDATE internal_bulk_inventory
      SET weight_grams = weight_grams - allocation_record.allocated_quantity,
          updated_at = now()
      WHERE id = allocation_record.inventory_id
      RETURNING weight_grams + allocation_record.allocated_quantity, weight_grams
      INTO previous_qty, new_qty;

      -- Validate inventory didn't go negative
      IF new_qty < 0 THEN
        RAISE EXCEPTION 'Insufficient bulk inventory for allocation %', allocation_record.id;
      END IF;

    ELSIF allocation_record.inventory_type = 'packaged' THEN
      -- Deduct from packaged inventory
      UPDATE internal_packaged_inventory
      SET units_count = units_count - allocation_record.allocated_quantity,
          updated_at = now()
      WHERE id = allocation_record.inventory_id
      RETURNING units_count + allocation_record.allocated_quantity, units_count
      INTO previous_qty, new_qty;

      -- Validate inventory didn't go negative
      IF new_qty < 0 THEN
        RAISE EXCEPTION 'Insufficient packaged inventory for allocation %', allocation_record.id;
      END IF;
    END IF;

    -- Mark allocation as consumed
    UPDATE order_item_allocations
    SET allocation_status = 'consumed',
        updated_at = now()
    WHERE id = allocation_record.id;

    -- Log transaction
    INSERT INTO inventory_transactions (
      transaction_type,
      order_id,
      order_item_id,
      allocation_id,
      inventory_type,
      inventory_id,
      strain,
      product_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      transaction_reason
    ) VALUES (
      'deduction',
      allocation_record.order_id,
      allocation_record.order_item_id,
      allocation_record.id,
      allocation_record.inventory_type,
      allocation_record.inventory_id,
      allocation_record.strain,
      allocation_record.product_type,
      -allocation_record.allocated_quantity,
      previous_qty,
      new_qty,
      'Order marked as ready for delivery'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to restore inventory when order is rolled back
CREATE OR REPLACE FUNCTION restore_inventory_for_order(order_id_param uuid)
RETURNS void AS $$
DECLARE
  allocation_record RECORD;
  previous_qty numeric;
  new_qty numeric;
BEGIN
  -- Process all consumed allocations for this order
  FOR allocation_record IN
    SELECT *
    FROM order_item_allocations
    WHERE order_id = order_id_param
    AND allocation_status = 'consumed'
  LOOP
    IF allocation_record.inventory_type = 'bulk' THEN
      -- Restore to bulk inventory
      UPDATE internal_bulk_inventory
      SET weight_grams = weight_grams + allocation_record.allocated_quantity,
          updated_at = now()
      WHERE id = allocation_record.inventory_id
      RETURNING weight_grams - allocation_record.allocated_quantity, weight_grams
      INTO previous_qty, new_qty;

    ELSIF allocation_record.inventory_type = 'packaged' THEN
      -- Restore to packaged inventory
      UPDATE internal_packaged_inventory
      SET units_count = units_count + allocation_record.allocated_quantity,
          updated_at = now()
      WHERE id = allocation_record.inventory_id
      RETURNING units_count - allocation_record.allocated_quantity, units_count
      INTO previous_qty, new_qty;
    END IF;

    -- Mark allocation as confirmed (no longer consumed)
    UPDATE order_item_allocations
    SET allocation_status = 'confirmed',
        updated_at = now()
    WHERE id = allocation_record.id;

    -- Log transaction
    INSERT INTO inventory_transactions (
      transaction_type,
      order_id,
      order_item_id,
      allocation_id,
      inventory_type,
      inventory_id,
      strain,
      product_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      transaction_reason
    ) VALUES (
      'restoration',
      allocation_record.order_id,
      allocation_record.order_item_id,
      allocation_record.id,
      allocation_record.inventory_type,
      allocation_record.inventory_id,
      allocation_record.strain,
      allocation_record.product_type,
      allocation_record.allocated_quantity,
      previous_qty,
      new_qty,
      'Order status rolled back from ready for delivery'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle order status changes
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Order is being marked as ready for delivery
  IF NEW.status = 'ready_for_delivery' AND OLD.status != 'ready_for_delivery' THEN
    -- Validate all items are ready
    PERFORM validate_ready_for_delivery(NEW.id);

    -- Deduct inventory
    PERFORM deduct_inventory_for_order(NEW.id);

  -- Order is being rolled back from ready for delivery
  ELSIF OLD.status = 'ready_for_delivery' AND NEW.status != 'ready_for_delivery' AND NEW.status != 'completed' THEN
    -- Restore inventory
    PERFORM restore_inventory_for_order(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_order_status_change();

-- Function to prevent allocation changes for consumed allocations
CREATE OR REPLACE FUNCTION prevent_consumed_allocation_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.allocation_status = 'consumed' AND TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Cannot modify consumed allocations. Order must be moved back to processing status first.';
  END IF;

  IF OLD.allocation_status = 'consumed' AND TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete consumed allocations. Order must be moved back to processing status first.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent changes to consumed allocations
DROP TRIGGER IF EXISTS prevent_consumed_allocation_changes_trigger ON order_item_allocations;
CREATE TRIGGER prevent_consumed_allocation_changes_trigger
  BEFORE UPDATE OR DELETE ON order_item_allocations
  FOR EACH ROW
  WHEN (OLD.allocation_status = 'consumed')
  EXECUTE FUNCTION prevent_consumed_allocation_changes();
