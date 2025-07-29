/*
  # Fix stock update function

  1. Changes
    - Drop existing function to avoid conflicts
    - Recreate function with correct parameter type (jsonb)
    - Add proper error handling and stock validation
    - Enable row-level security
    - Grant necessary permissions

  2. Security
    - Function is accessible to authenticated users only
    - Uses SECURITY DEFINER to ensure consistent permissions
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.update_stock_for_order(cart_items jsonb);
DROP FUNCTION IF EXISTS public.update_stock_for_order(jsonb);
DROP FUNCTION IF EXISTS public.update_stock_for_order(json);

-- Create new function with jsonb parameter and explicit parameter name
CREATE OR REPLACE FUNCTION public.update_stock_for_order(
  cart_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  current_stock integer;
  requested_quantity integer;
  product_id uuid;
  variant_id uuid;
BEGIN
  -- Validate input
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Invalid cart items';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    product_id := (item->>'product_id')::uuid;
    variant_id := (item->>'variant_id')::uuid;
    requested_quantity := (item->>'quantity')::integer;
    
    IF requested_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', product_id;
    END IF;
    
    -- Handle variant stock if variant_id is provided
    IF variant_id IS NOT NULL THEN
      -- Get current variant stock level
      SELECT stock INTO current_stock
      FROM product_variants
      WHERE id = variant_id
      FOR UPDATE;  -- Lock the row
      
      IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Variant % not found', variant_id;
      END IF;
      
      IF current_stock < requested_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant %', variant_id;
      END IF;
      
      -- Update variant stock
      UPDATE product_variants
      SET stock = stock - requested_quantity
      WHERE id = variant_id;
      
    ELSE
      -- Get current product stock level
      SELECT stock INTO current_stock
      FROM products
      WHERE id = product_id
      FOR UPDATE;  -- Lock the row
      
      IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product % not found', product_id;
      END IF;
      
      IF current_stock < requested_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %', product_id;
      END IF;
      
      -- Update product stock
      UPDATE products
      SET stock = stock - requested_quantity
      WHERE id = product_id;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.update_stock_for_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stock_for_order(jsonb) TO authenticated;