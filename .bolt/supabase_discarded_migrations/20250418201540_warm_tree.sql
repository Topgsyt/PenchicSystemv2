-- Drop existing product policies
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Admins can modify products" ON products;

-- Create new policies
CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated read access to products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin full access to products"
  ON products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));