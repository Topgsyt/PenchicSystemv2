/*
  # Supermarket Schema Setup

  1. Changes
    - Update profiles table to include worker role
    - Add discount and payment tracking
    - Add stock change logging
    - Add sales reporting tables
    
  2. Security
    - Update RLS policies for new roles
    - Maintain existing security patterns
*/

-- Modify profiles table to include worker role
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'worker', 'customer'));

-- Create discounts table
CREATE TABLE discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products ON DELETE CASCADE,
  percentage decimal(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  CHECK (end_date > start_date)
);

-- Create stock_logs table
CREATE TABLE stock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants ON DELETE CASCADE,
  previous_stock int NOT NULL,
  new_stock int NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('sale', 'restock', 'adjustment')),
  changed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  mpesa_reference text,
  authorized_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for discounts
CREATE POLICY "Anyone can view discounts"
  ON discounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage discounts"
  ON discounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for stock_logs
CREATE POLICY "Admins can view all stock logs"
  ON stock_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Workers can view stock logs"
  ON stock_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'worker'
    )
  );

-- Policies for payments
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Workers can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Function to log stock changes
CREATE OR REPLACE FUNCTION log_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_logs (
    product_id,
    variant_id,
    previous_stock,
    new_stock,
    change_type,
    changed_by
  ) VALUES (
    NEW.id,
    NULL,
    OLD.stock,
    NEW.stock,
    CASE
      WHEN NEW.stock > OLD.stock THEN 'restock'
      WHEN NEW.stock < OLD.stock THEN 'sale'
      ELSE 'adjustment'
    END,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for logging stock changes
CREATE TRIGGER log_stock_changes
AFTER UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION log_stock_change();