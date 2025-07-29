/*
  # Fix M-Pesa Transaction Relationships

  1. Changes
    - Drop existing mpesa_transactions table
    - Recreate mpesa_transactions table with correct foreign key relationships
    - Add appropriate indexes for performance
    
  2. Security
    - Re-enable RLS
    - Recreate policies with correct relationships
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS mpesa_transactions CASCADE;

-- Recreate mpesa_transactions table with correct relationships
CREATE TABLE mpesa_transactions (
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

-- Add indexes for better query performance
CREATE INDEX mpesa_transactions_order_id_idx ON mpesa_transactions(order_id);
CREATE INDEX mpesa_transactions_user_id_idx ON mpesa_transactions(user_id);
CREATE INDEX mpesa_transactions_status_idx ON mpesa_transactions(status);

-- Enable RLS
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Recreate policies with correct relationships
CREATE POLICY "Users can view own transactions"
  ON mpesa_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Edge functions can create transactions"
  ON mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can update transactions"
  ON mpesa_transactions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );