/*
  # Update Order Number Generation to Use Dispensary Code

  1. Changes
    - Drop existing order number generation trigger and function
    - Create new function that generates order numbers in format: ABC251011 (dispensary_code + YYMMDD)
    - Add sequential suffix for same-day orders from same dispensary: ABC251011-1, ABC251011-2
    - Preserve existing order numbers (do not regenerate)

  2. Order Number Format
    - ABC: 3-character dispensary code from customers table
    - 25: Last 2 digits of year
    - 10: Month (01-12)
    - 11: Day (01-31)
    - -N: Optional sequential suffix for multiple orders on same day from same dispensary

  3. Examples
    - ANC251011: First order from ANC on October 11, 2025
    - ANC251011-2: Second order from ANC on October 11, 2025
    - SOL251225: First order from Sol Flower on December 25, 2025

  4. Security
    - No changes to RLS policies
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;

-- Drop existing function
DROP FUNCTION IF EXISTS generate_order_number();

-- Create new order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  dispensary_code_val text;
  date_part text;
  base_order_number text;
  next_suffix integer;
  final_order_number text;
BEGIN
  -- Only generate if order_number is not already set
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    
    -- Get dispensary code from customer
    SELECT c.dispensary_code INTO dispensary_code_val
    FROM customers c
    WHERE c.id = NEW.customer_id;
    
    -- If no dispensary code found, raise error
    IF dispensary_code_val IS NULL THEN
      RAISE EXCEPTION 'Customer must have a dispensary_code assigned';
    END IF;
    
    -- Generate date part (YYMMDD format)
    date_part := TO_CHAR(COALESCE(NEW.order_date, CURRENT_TIMESTAMP), 'YYMMDD');
    
    -- Create base order number (dispensary code + date)
    base_order_number := dispensary_code_val || date_part;
    
    -- Check if this exact order number already exists
    IF EXISTS (SELECT 1 FROM orders WHERE order_number = base_order_number) THEN
      -- Find the next available suffix
      SELECT COALESCE(MAX(
        CASE 
          WHEN order_number ~ ('^' || base_order_number || '-[0-9]+$') 
          THEN CAST(SUBSTRING(order_number FROM (length(base_order_number) + 2)) AS integer)
          ELSE 0
        END
      ), 0) + 1 INTO next_suffix
      FROM orders
      WHERE order_number LIKE base_order_number || '%';
      
      final_order_number := base_order_number || '-' || next_suffix;
    ELSE
      final_order_number := base_order_number;
    END IF;
    
    NEW.order_number := final_order_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order number generation
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();
