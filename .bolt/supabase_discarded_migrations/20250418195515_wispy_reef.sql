-- Drop existing policies
DROP POLICY IF EXISTS "Public can read products" ON products;
DROP POLICY IF EXISTS "Admins can modify products" ON products;

-- Create new policies with no authentication requirement for SELECT
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify products"
  ON products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));