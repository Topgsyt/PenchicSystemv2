/*
  # M-Pesa Integration Schema

  1. New Tables
    - mpesa_transactions: Track M-Pesa payment requests and callbacks
    - mpesa_configs: Store M-Pesa API configuration
    
  2. Security
    - Enable RLS
    - Add policies for users and admins
*/

-- Create mpesa_configs table
CREATE TABLE mpesa_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_shortcode text NOT NULL,
  passkey text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mpesa_transactions table
CREATE TABLE mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  checkout_request_id text,
  merchant_request_id text,
  phone_number text NOT NULL,
  amount decimal(10,2) NOT NULL,
  reference_number text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_code text,
  result_desc text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mpesa_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for mpesa_configs
CREATE POLICY "Only admins can manage mpesa_configs"
  ON mpesa_configs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policies for mpesa_transactions
CREATE POLICY "Users can view own transactions"
  ON mpesa_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE id = mpesa_transactions.order_id AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all transactions"
  ON mpesa_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "System can create transactions"
  ON mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update transactions"
  ON mpesa_transactions FOR UPDATE
  TO authenticated
  USING (true);