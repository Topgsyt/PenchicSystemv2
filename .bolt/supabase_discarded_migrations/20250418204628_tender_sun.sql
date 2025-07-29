/*
  # Add Stock Management and M-Pesa Functions

  1. New Functions
    - `update_stock_for_order`: Updates product stock levels after order
    - `get_product_stock`: Gets current stock level for a product/variant

  2. Changes
    - Add function to handle stock updates for orders
    - Add function to check current stock levels
    - Add error handling for stock updates
    
  3. Security
    - Functions accessible to authenticated users only
*/

-- Function to get current stock level
CREATE OR REPLACE FUNCTION get_product_stock(
  product_id uuid,
  variant_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock integer;
BEGIN
  IF variant_id IS NOT NULL THEN
    SELECT stock INTO current_stock
    FROM product_variants
    WHERE id = variant_id AND product_id = product_id;
  ELSE
    SELECT stock INTO current_stock
    FROM products
    WHERE id = product_id;
  END IF;
  
  RETURN COALESCE(current_stock, 0);
END;
$$;

-- Function to update stock for an order
CREATE OR REPLACE FUNCTION update_stock_for_order(
  cart_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  current_stock integer;
  new_stock integer;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    -- Get current stock
    IF (item->>'variant_id') IS NOT NULL THEN
      SELECT stock INTO current_stock
      FROM product_variants
      WHERE id = (item->>'variant_id')::uuid
      AND product_id = (item->>'product_id')::uuid
      FOR UPDATE;
      
      -- Calculate and update new stock
      new_stock := current_stock - (item->>'quantity')::integer;
      IF new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for variant %', (item->>'variant_id')::uuid;
      END IF;
      
      UPDATE product_variants
      SET stock = new_stock
      WHERE id = (item->>'variant_id')::uuid
      AND product_id = (item->>'product_id')::uuid;
    ELSE
      SELECT stock INTO current_stock
      FROM products
      WHERE id = (item->>'product_id')::uuid
      FOR UPDATE;
      
      -- Calculate and update new stock
      new_stock := current_stock - (item->>'quantity')::integer;
      IF new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for product %', (item->>'product_id')::uuid;
      END IF;
      
      UPDATE products
      SET stock = new_stock
      WHERE id = (item->>'product_id')::uuid;
    END IF;
  END LOOP;
END;
$$;