/*
  # Add Stock Update Procedure

  1. Changes
    - Add stored procedure for updating stock during order processing
    - Handle both product and variant stock updates
    - Validate stock levels before processing
    - Return success/failure status
*/

-- Create type for cart items
CREATE TYPE cart_item AS (
  product_id uuid,
  variant_id uuid,
  quantity int
);

-- Create function to update stock for order
CREATE OR REPLACE FUNCTION update_stock_for_order(cart_items cart_item[])
RETURNS boolean AS $$
DECLARE
  item cart_item;
  current_stock int;
BEGIN
  -- Check each item in the cart
  FOREACH item IN ARRAY cart_items LOOP
    -- If it's a variant
    IF item.variant_id IS NOT NULL THEN
      -- Get current stock
      SELECT stock INTO current_stock
      FROM product_variants
      WHERE id = item.variant_id;

      -- Check if enough stock
      IF current_stock < item.quantity THEN
        RETURN false;
      END IF;

      -- Update variant stock
      UPDATE product_variants
      SET stock = stock - item.quantity
      WHERE id = item.variant_id;

    -- If it's a regular product
    ELSE
      -- Get current stock
      SELECT stock INTO current_stock
      FROM products
      WHERE id = item.product_id;

      -- Check if enough stock
      IF current_stock < item.quantity THEN
        RETURN false;
      END IF;

      -- Update product stock
      UPDATE products
      SET stock = stock - item.quantity
      WHERE id = item.product_id;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql;