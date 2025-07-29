/*
  # Create payment info table and update M-Pesa payment flow

  1. New Tables
    - `payment_info`
      - `id` (uuid, primary key)
      - `paybill_number` (text)
      - `account_number` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payment_info` table
    - Add policy for authenticated users to read payment info
    - Add policy for admin users to manage payment info

  3. Initial Data
    - Insert default payment info
*/

CREATE TABLE IF NOT EXISTS payment_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paybill_number text NOT NULL,
  account_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment info"
  ON payment_info
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage payment info"
  ON payment_info
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default payment info
INSERT INTO payment_info (paybill_number, account_number)
VALUES ('247247', '073593')
ON CONFLICT DO NOTHING;