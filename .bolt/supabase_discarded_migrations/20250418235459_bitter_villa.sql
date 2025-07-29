/*
  # Create M-Pesa Transaction Tables

  1. New Tables
    - mpesa_configs: Stores M-Pesa API configuration
      - id (uuid, primary key)
      - business_shortcode (text)
      - passkey (text)
      - consumer_key (text)
      - consumer_secret (text)
      - environment (text)
      - timestamps
    
    - mpesa_transactions: Tracks M-Pesa payments
      - id (uuid, primary key)
      - order_id (uuid, references orders)
      - user_id (uuid, references profiles)
      - checkout_request_id (text)
      - merchant_request_id (text)
      - phone_number (text)
      - amount (decimal)
      - reference_number (text)
      - description (text)
      - status (text)
      - result_code (text)
      - result_desc (text)
      - timestamps

  2. Security
    - Enable RLS on both tables
    - Add policies for admin access and user read access
*/

-- Create mpesa_configs table
CREATE TABLE IF NOT EXISTS public.mpesa_configs (
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
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  checkout_request_id text,
  merchant_request_id text,
  phone_number text NOT NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  reference_number text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_code text,
  result_desc text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mpesa_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_order_id ON mpesa_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_user_id ON mpesa_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON mpesa_transactions(status);

-- Set up RLS policies
CREATE POLICY "Users can view own transactions"
  ON public.mpesa_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow insert for authenticated users"
  ON public.mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for system and admins"
  ON public.mpesa_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage mpesa_configs"
  ON public.mpesa_configs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));