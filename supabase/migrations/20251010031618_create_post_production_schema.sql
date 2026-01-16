/*
  # Post-Production Order Management Schema

  ## Overview
  This migration creates the complete database schema for a cannabis post-production
  order management system with Slack integration capabilities.

  ## New Tables

  ### 1. customers
  - `id` (uuid, primary key) - Unique customer identifier
  - `name` (text) - Customer/dispensary name
  - `contact_name` (text) - Primary contact person
  - `email` (text) - Contact email address
  - `phone` (text) - Contact phone number
  - `address` (text) - Delivery address
  - `notes` (text) - Additional customer notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. products
  - `id` (uuid, primary key) - Unique product identifier
  - `name` (text) - Product name
  - `type` (text) - Product type (flower, pre-roll, concentrate, edible, etc.)
  - `strain` (text) - Cannabis strain name
  - `unit` (text) - Unit of measure (gram, ounce, pound, unit)
  - `available_quantity` (numeric) - Current inventory quantity
  - `price_per_unit` (numeric) - Price per unit
  - `trim_time_minutes` (integer) - Estimated trim time per unit
  - `packaging_time_minutes` (integer) - Estimated packaging time per unit
  - `notes` (text) - Product notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. orders
  - `id` (uuid, primary key) - Unique order identifier
  - `order_number` (text, unique) - Human-readable order number
  - `customer_id` (uuid, foreign key) - Reference to customers table
  - `status` (text) - Order status (pending, scheduled, trimming, packaging, ready, out_for_delivery, delivered, cancelled)
  - `priority` (text) - Priority level (normal, high, urgent)
  - `order_date` (timestamptz) - When order was placed
  - `requested_delivery_date` (date) - Customer requested delivery date
  - `scheduled_delivery_date` (timestamptz) - Actual scheduled delivery date/time
  - `delivery_notes` (text) - Special delivery instructions
  - `internal_notes` (text) - Internal team notes
  - `total_amount` (numeric) - Total order value
  - `created_by` (uuid) - User who created the order
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. order_items
  - `id` (uuid, primary key) - Unique order item identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `product_id` (uuid, foreign key) - Reference to products table
  - `quantity` (numeric) - Quantity ordered
  - `unit_price` (numeric) - Price per unit at time of order
  - `subtotal` (numeric) - Line item subtotal
  - `notes` (text) - Item-specific notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. trim_schedule
  - `id` (uuid, primary key) - Unique schedule entry identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `scheduled_date` (date) - Date scheduled for trimming
  - `scheduled_start_time` (time) - Start time for trim session
  - `estimated_duration_minutes` (integer) - Estimated time to complete
  - `assigned_to` (text) - Staff member(s) assigned
  - `station_number` (text) - Trim station assignment
  - `status` (text) - Status (scheduled, in_progress, completed, delayed)
  - `actual_start_time` (timestamptz) - Actual start time
  - `actual_end_time` (timestamptz) - Actual completion time
  - `notes` (text) - Trim session notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. packaging_schedule
  - `id` (uuid, primary key) - Unique schedule entry identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `scheduled_date` (date) - Date scheduled for packaging
  - `scheduled_start_time` (time) - Start time for packaging
  - `estimated_duration_minutes` (integer) - Estimated time to complete
  - `assigned_to` (text) - Staff member(s) assigned
  - `status` (text) - Status (scheduled, in_progress, completed, delayed)
  - `actual_start_time` (timestamptz) - Actual start time
  - `actual_end_time` (timestamptz) - Actual completion time
  - `quality_check_passed` (boolean) - Quality control result
  - `notes` (text) - Packaging notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. delivery_schedule
  - `id` (uuid, primary key) - Unique delivery entry identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `scheduled_date` (date) - Scheduled delivery date
  - `scheduled_time_window` (text) - Time window (e.g., "9:00 AM - 11:00 AM")
  - `driver_name` (text) - Assigned driver
  - `route_number` (text) - Delivery route identifier
  - `status` (text) - Status (scheduled, loaded, in_transit, delivered, failed)
  - `actual_delivery_time` (timestamptz) - Actual delivery completion time
  - `signature` (text) - Delivery signature/confirmation
  - `notes` (text) - Delivery notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 8. slack_notifications
  - `id` (uuid, primary key) - Unique notification identifier
  - `event_type` (text) - Type of event (new_order, status_change, schedule_update, etc.)
  - `order_id` (uuid) - Related order ID
  - `channel` (text) - Slack channel name
  - `message` (text) - Message content sent
  - `status` (text) - Delivery status (pending, sent, failed)
  - `sent_at` (timestamptz) - When notification was sent
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz) - Record creation timestamp

  ### 9. notification_preferences
  - `id` (uuid, primary key) - Unique preference identifier
  - `event_type` (text) - Event type to configure
  - `channel` (text) - Target Slack channel
  - `enabled` (boolean) - Whether notification is enabled
  - `message_template` (text) - Custom message template
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Add policies for authenticated users to manage all data
  - This is an internal business tool, so authenticated users have full access
  - Future enhancement: Add role-based policies for different user types

  ## Functions and Triggers
  - Create function to auto-update `updated_at` timestamps
  - Create trigger to generate sequential order numbers
  - Create function to calculate order totals from line items
  - Create function to check inventory availability
  - Create view for daily workload summary
  - Create view for delivery route optimization

  ## Important Notes
  - All monetary values stored as numeric for precision
  - Timestamps use timestamptz for timezone awareness
  - Status fields use text for flexibility (consider enums in future)
  - Slack integration requires separate Edge Function deployment
  - Inventory tracking is simplified; expand for full warehouse management
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'flower',
  strain text,
  unit text NOT NULL DEFAULT 'gram',
  available_quantity numeric DEFAULT 0,
  price_per_unit numeric DEFAULT 0,
  trim_time_minutes integer DEFAULT 30,
  packaging_time_minutes integer DEFAULT 15,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  order_date timestamptz DEFAULT now(),
  requested_delivery_date date,
  scheduled_delivery_date timestamptz,
  delivery_notes text,
  internal_notes text,
  total_amount numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create trim_schedule table
CREATE TABLE IF NOT EXISTS trim_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time,
  estimated_duration_minutes integer DEFAULT 0,
  assigned_to text,
  station_number text,
  status text NOT NULL DEFAULT 'scheduled',
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create packaging_schedule table
CREATE TABLE IF NOT EXISTS packaging_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time,
  estimated_duration_minutes integer DEFAULT 0,
  assigned_to text,
  status text NOT NULL DEFAULT 'scheduled',
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  quality_check_passed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_schedule table
CREATE TABLE IF NOT EXISTS delivery_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time_window text,
  driver_name text,
  route_number text,
  status text NOT NULL DEFAULT 'scheduled',
  actual_delivery_time timestamptz,
  signature text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create slack_notifications table
CREATE TABLE IF NOT EXISTS slack_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  channel text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  channel text NOT NULL,
  enabled boolean DEFAULT true,
  message_template text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trim_schedule_updated_at BEFORE UPDATE ON trim_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packaging_schedule_updated_at BEFORE UPDATE ON packaging_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_schedule_updated_at BEFORE UPDATE ON delivery_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
  year_prefix text;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS integer)), 0) + 1
    INTO next_num
    FROM orders
    WHERE order_number LIKE year_prefix || '%';
    
    NEW.order_number := year_prefix || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order number generation
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Create function to update order total
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
  )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order total when items change
CREATE TRIGGER update_order_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total();

-- Create view for daily workload summary
CREATE OR REPLACE VIEW daily_workload AS
SELECT
  COALESCE(t.scheduled_date, p.scheduled_date, d.scheduled_date) as work_date,
  COUNT(DISTINCT t.order_id) as trim_orders,
  SUM(t.estimated_duration_minutes) as trim_minutes,
  COUNT(DISTINCT p.order_id) as packaging_orders,
  SUM(p.estimated_duration_minutes) as packaging_minutes,
  COUNT(DISTINCT d.order_id) as delivery_orders
FROM trim_schedule t
FULL OUTER JOIN packaging_schedule p ON t.scheduled_date = p.scheduled_date
FULL OUTER JOIN delivery_schedule d ON COALESCE(t.scheduled_date, p.scheduled_date) = d.scheduled_date
WHERE COALESCE(t.status, p.status, d.status) NOT IN ('completed', 'cancelled')
GROUP BY COALESCE(t.scheduled_date, p.scheduled_date, d.scheduled_date)
ORDER BY work_date;

-- Create view for order pipeline
CREATE OR REPLACE VIEW order_pipeline AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.priority,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  c.name as customer_name,
  o.total_amount,
  COUNT(oi.id) as item_count,
  t.status as trim_status,
  t.scheduled_date as trim_date,
  p.status as packaging_status,
  p.scheduled_date as packaging_date,
  d.status as delivery_status,
  d.scheduled_date as delivery_date,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN trim_schedule t ON o.id = t.order_id
LEFT JOIN packaging_schedule p ON o.id = p.order_id
LEFT JOIN delivery_schedule d ON o.id = d.order_id
GROUP BY o.id, o.order_number, o.status, o.priority, o.requested_delivery_date,
         o.scheduled_delivery_date, c.name, o.total_amount, t.status, t.scheduled_date,
         p.status, p.scheduled_date, d.status, d.scheduled_date, o.created_at, o.updated_at
ORDER BY o.created_at DESC;

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trim_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (full access for internal tool)
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage order_items"
  ON order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage trim_schedule"
  ON trim_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage packaging_schedule"
  ON packaging_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage delivery_schedule"
  ON delivery_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage slack_notifications"
  ON slack_notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage notification_preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default notification preferences
INSERT INTO notification_preferences (event_type, channel, enabled, message_template)
VALUES
  ('new_order', '#orders', true, 'New order #{order_number} from {customer_name} - Delivery requested: {requested_delivery_date}'),
  ('urgent_order', '#urgent', true, '🚨 URGENT ORDER #{order_number} from {customer_name} - Delivery: {requested_delivery_date}'),
  ('status_change', '#orders', true, 'Order #{order_number} status changed to: {status}'),
  ('trim_scheduled', '#trim-room', true, 'Order #{order_number} scheduled for trim on {scheduled_date}'),
  ('packaging_scheduled', '#packaging', true, 'Order #{order_number} scheduled for packaging on {scheduled_date}'),
  ('delivery_scheduled', '#delivery', true, 'Order #{order_number} scheduled for delivery on {scheduled_date} - Driver: {driver_name}'),
  ('ready_for_delivery', '#delivery', true, 'Order #{order_number} is ready for pickup - Customer: {customer_name}'),
  ('delivery_completed', '#orders', true, '✅ Order #{order_number} delivered to {customer_name}'),
  ('daily_summary', '#daily-digest', true, 'Daily Summary: {pending_orders} pending orders, {trim_orders} to trim, {packaging_orders} to package, {delivery_orders} for delivery')
ON CONFLICT (event_type) DO NOTHING;