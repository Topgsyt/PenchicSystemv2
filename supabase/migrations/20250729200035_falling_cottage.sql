/*
  # Settings and Configuration Tables

  1. New Tables
    - business_settings: Store business information
    - tax_rates: Store tax configuration
    - discounts: Store discount rules
    - payment_info: Store payment configuration
    
  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create business_settings table
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Penchic Farm',
  address text NOT NULL DEFAULT 'Limuru, Kiambu County, Kenya',
  phone text NOT NULL DEFAULT '+254 722 395 370',
  email text NOT NULL DEFAULT 'info@penchicfarm.com',
  tax_id text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tax_rates table
CREATE TABLE IF NOT EXISTS tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate decimal(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create payment_info table
CREATE TABLE IF NOT EXISTS payment_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paybill_number text NOT NULL DEFAULT '174379',
  account_number text NOT NULL DEFAULT 'PENCHIC001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_info ENABLE ROW LEVEL SECURITY;

-- Create policies for business_settings
CREATE POLICY "Anyone can read business settings"
  ON business_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage business settings"
  ON business_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create policies for tax_rates
CREATE POLICY "Anyone can read tax rates"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tax rates"
  ON tax_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create policies for payment_info
CREATE POLICY "Anyone can read payment info"
  ON payment_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage payment info"
  ON payment_info FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default data
INSERT INTO business_settings (name, address, phone, email, tax_id) 
VALUES ('Penchic Farm', 'Limuru, Kiambu County, Kenya', '+254 722 395 370', 'info@penchicfarm.com', 'P051234567A')
ON CONFLICT DO NOTHING;

INSERT INTO tax_rates (name, rate, is_default) 
VALUES ('VAT', 16.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO payment_info (paybill_number, account_number) 
VALUES ('174379', 'PENCHIC001')
ON CONFLICT DO NOTHING;