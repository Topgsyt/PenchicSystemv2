/*
  # M-Pesa Configuration Schema

  1. Changes
    - Create mpesa_configs table for API configuration
    
  2. Security
    - Enable RLS
    - Add policies for admins
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

-- Enable RLS
ALTER TABLE public.mpesa_configs ENABLE ROW LEVEL SECURITY;

-- Policies for mpesa_configs
CREATE POLICY "Only admins can manage mpesa_configs"
  ON public.mpesa_configs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));