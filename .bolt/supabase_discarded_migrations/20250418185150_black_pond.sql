/*
  # Add stock management stored procedure

  1. New Functions
    - `update_stock_for_order`: A stored procedure that safely updates product stock levels
      - Takes an array of cart items (product_id and quantity)
      - Updates stock levels atomically
      - Checks stock availability before updating
      - Throws an error if stock would become negative

  2. Security
    - Function is accessible to authenticated users only
*/

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
  requested_quantity integer;
  product_id uuid;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    product_id := (item->>'product_id')::uuid;
    requested_quantity := (item->>'quantity')::integer;
    
    -- Get current stock level
    SELECT stock INTO current_stock
    FROM products
    WHERE id = product_id
    FOR UPDATE;  -- Lock the row
    
    IF current_stock < requested_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', product_id;
    END IF;
    
    -- Update stock
    UPDATE products
    SET stock = stock - requested_quantity
    WHERE id = product_id;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_stock_for_order TO authenticated;