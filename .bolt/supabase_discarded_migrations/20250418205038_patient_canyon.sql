/*
  # Create M-Pesa Tables

  1. Tables
    - mpesa_transactions: Track M-Pesa payment transactions
    
  2. Security
    - Enable RLS
    - Add policies for users and admins
*/

-- Create mpesa_transactions table
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text,
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  order_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT mpesa_transactions_status_check CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own transactions"
  ON public.mpesa_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id::text = mpesa_transactions.order_id 
      AND orders.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
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
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_order_id ON public.mpesa_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON public.mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_created_at ON public.mpesa_transactions(created_at DESC);