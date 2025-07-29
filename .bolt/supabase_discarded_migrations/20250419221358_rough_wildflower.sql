/*
  # Add Worker Role and Permissions

  1. Changes
    - Update RLS policies for payments and orders
    - Add policies for workers to view stock
    - Ensure workers can't access admin features
    
  2. Security
    - Workers can authorize payments
    - Workers can view stock levels
    - Workers cannot modify stock or access admin features
*/

-- Update policies for payments table
CREATE POLICY "Workers can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'worker')
    )
  );

-- Create policy for workers to view products
CREATE POLICY "Workers can view products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'worker')
    )
  );

-- Update orders policies to include workers
CREATE POLICY "Workers can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'worker')
    )
  );

-- Allow workers to view order items
CREATE POLICY "Workers can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'worker')
    )
  );