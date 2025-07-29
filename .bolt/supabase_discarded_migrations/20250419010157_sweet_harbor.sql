/*
  # Fix M-Pesa Integration Schema

  1. Changes
    - Create mpesa_configs table for API configuration
    - Create mpesa_transactions table with correct relationships
    - Add appropriate indexes for performance
    
  2. Security
    - Enable RLS
    - Add policies for users and admins
*/

-- Create mpesa_configs table if it doesn't exist
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

-- Create mpesa_transactions table if it doesn't exist
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS mpesa_transactions_order_id_idx ON public.mpesa_transactions(order_id);
CREATE INDEX IF NOT EXISTS mpesa_transactions_user_id_idx ON public.mpesa_transactions(user_id);
CREATE INDEX IF NOT EXISTS mpesa_transactions_status_idx ON public.mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS mpesa_transactions_created_at_idx ON public.mpesa_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.mpesa_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for mpesa_configs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mpesa_configs' AND policyname = 'Only admins can manage mpesa_configs'
  ) THEN
    CREATE POLICY "Only admins can manage mpesa_configs"
      ON public.mpesa_configs FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- Policies for mpesa_transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mpesa_transactions' AND policyname = 'Users can view own transactions'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mpesa_transactions' AND policyname = 'Users can create transactions'
  ) THEN
    CREATE POLICY "Users can create transactions"
      ON public.mpesa_transactions FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mpesa_transactions' AND policyname = 'Users can update own transactions'
  ) THEN
    CREATE POLICY "Users can update own transactions"
      ON public.mpesa_transactions FOR UPDATE
      TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;