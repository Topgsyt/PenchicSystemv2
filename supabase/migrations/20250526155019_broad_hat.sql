/*
  # POS System Schema Setup

  1. New Tables
    - pos_sessions: Track active POS sessions
    - pos_transactions: Store transaction history
    - suspended_orders: Store suspended transactions
    
  2. Security
    - Enable RLS
    - Add policies for admin and worker roles
*/

-- Create pos_sessions table
CREATE TABLE pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  initial_float decimal(10,2) DEFAULT 0,
  closing_amount decimal(10,2),
  notes text
);

-- Create pos_transactions table
CREATE TABLE pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'void')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
  subtotal decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create suspended_orders table
CREATE TABLE suspended_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  items jsonb NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspended_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for pos_sessions
CREATE POLICY "Admin and workers can manage POS sessions"
  ON pos_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Create policies for pos_transactions
CREATE POLICY "Admin and workers can manage transactions"
  ON pos_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Create policies for suspended_orders
CREATE POLICY "Admin and workers can manage suspended orders"
  ON suspended_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'worker')
    )
  );

-- Function to start POS session
CREATE OR REPLACE FUNCTION start_pos_session(
  p_user_id uuid,
  p_initial_float decimal(10,2) DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Check if user is admin or worker
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role IN ('admin', 'worker')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admin and workers can start POS sessions';
  END IF;

  -- Check if user already has an active session
  IF EXISTS (
    SELECT 1 FROM pos_sessions
    WHERE user_id = p_user_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User already has an active POS session';
  END IF;

  -- Create new session
  INSERT INTO pos_sessions (user_id, initial_float)
  VALUES (p_user_id, p_initial_float)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;