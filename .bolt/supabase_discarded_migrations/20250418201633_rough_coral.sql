/*
  # Allow Public Access to Products
  
  1. Changes
    - Drop existing product policies
    - Create new policy allowing public read access
    - Maintain admin-only write access
    
  2. Security
    - Anyone can view products without authentication
    - Only admins can modify products
*/

-- Drop existing product policies
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
DROP POLICY IF EXISTS "Allow authenticated read access to products" ON products;
DROP POLICY IF EXISTS "Allow admin full access to products" ON products;

-- Create new policies
CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to products"
  ON products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));