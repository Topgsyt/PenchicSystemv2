/*
  # Add RLS policies for stock_logs table

  1. Changes
    - Add RLS policies for stock_logs table
    - Allow admins to manage stock logs
    - Allow workers to view stock logs
    
  2. Security
    - Maintain existing RLS protection
    - Add proper access control for stock logs
*/

-- Create policies for stock_logs
CREATE POLICY "Admins can manage stock logs"
  ON stock_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Workers can view stock logs"
  ON stock_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'worker'
    )
  );