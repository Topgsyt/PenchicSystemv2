/*
  # Add M-Pesa Integration Tables

  1. New Tables
    - mpesa_transactions: Track M-Pesa payment attempts and confirmations
    
  2. Security
    - Enable RLS
    - Add policies for users and admins
*/

-- Create mpesa_transactions table
CREATE TABLE mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  user_id uuid REFERENCES profiles ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  phone_number text NOT NULL,
  transaction_code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for mpesa_transactions
CREATE POLICY "Users can view own transactions"
  ON mpesa_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
  ON mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON mpesa_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));