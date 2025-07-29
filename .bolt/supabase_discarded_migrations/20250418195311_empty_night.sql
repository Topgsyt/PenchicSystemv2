/*
  # Update Products Policy

  1. Changes
    - Allow public access to read products
    - Keep admin-only restrictions for modifications
    
  2. Security
    - Maintain existing admin policies
    - Add public read access
*/

-- Drop existing product policies
DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Admins can modify products" ON products;

-- Create new policies
CREATE POLICY "Public can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify products"
  ON products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));